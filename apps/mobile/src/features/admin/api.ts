import type {
  AdminAttendanceResponse,
  AdminDownloadPreview,
  AdminOffDaysResponse,
  AdminMemberDetail,
  AdminMemberSummary,
  CellDetailResponse,
  CreateHomeBannerRequest,
  HomeBanner,
  UpdateHomeBannerRequest,
  OffDayKind,
  UpdateAdminMemberRequest,
} from "@onnuri/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "../../shared/api/client";

// 회원 목록 (관리자 전용 GET /users) — 회원 관리 목록과 셀장/부셀장 선택지가 같이 쓴다.
export function useAdminMembers(enabled = true) {
  return useQuery({
    queryKey: ["admin", "members"],
    queryFn: () =>
      apiClient.get<AdminMemberSummary[]>("/users").then((res) => res.data),
    // GET /users는 관리자 전용 — 비관리자 화면(소그룹 수정의 소그룹장)에서는 요청 자체를 끈다.
    enabled,
  });
}

// 회원 상세 (관리자 전용 GET /users/:id) — 상세 화면 문구 + 편집 프리필 원본.
export function useAdminMember(memberId: string) {
  return useQuery({
    queryKey: ["admin", "members", memberId],
    queryFn: () =>
      apiClient.get<AdminMemberDetail>(`/users/${memberId}`).then((res) => res.data),
  });
}

// 회원 수정·삭제는 소속·역할이 바뀌어 셀 목록(셀장 이름)까지 영향이 가므로 같이 무효화한다.
function useInvalidateMembers() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
    void queryClient.invalidateQueries({ queryKey: ["cells"] });
  };
}

export function useUpdateAdminMember(memberId: string) {
  const invalidateMembers = useInvalidateMembers();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateAdminMemberRequest) =>
      apiClient
        .patch<AdminMemberDetail>(`/users/${memberId}`, payload)
        .then((res) => res.data),
    onSuccess: (detail) => {
      queryClient.setQueryData(["admin", "members", memberId], detail);
      invalidateMembers();
    },
  });
}

export function useDeleteAdminMember() {
  const invalidateMembers = useInvalidateMembers();
  return useMutation({
    mutationFn: (memberId: string) =>
      apiClient.delete<{ id: string }>(`/users/${memberId}`).then((res) => res.data),
    onSuccess: invalidateMembers,
  });
}

/** GET /admin/attendance 파라미터 — scope가 cell/team이면 groupId 필수 (서버 검증) */
export interface AdminAttendanceParams {
  /** YYYY-MM */
  month: string;
  scope: "all" | "cell" | "team";
  groupId?: string;
}

// 출석부 집계 (관리자 전용) — 셀·개인 출석 기록을 주차 × 회원 O/X/- 표로 묶어 내려준다.
export function useAdminAttendance(params: AdminAttendanceParams) {
  return useQuery({
    queryKey: ["admin", "attendance", params],
    queryFn: () =>
      apiClient
        .get<AdminAttendanceResponse>("/admin/attendance", { params })
        .then((res) => res.data),
    // 셀·멤버 구성이 바뀐 직후에도 최신이 보이도록 캐시를 쓰지 않는다 (기본 staleTime 1분).
    staleTime: 0,
    // 특정 셀/팀 필터인데 아직 선택지가 안 뽑혔으면(목록 로딩 전) 기다린다.
    enabled: params.scope === "all" || params.groupId !== undefined,
  });
}

/** 셀 생성/수정 공통 본문 — viceLeaderId null = 부셀장 없음(체크 해제) */
export interface CellFormPayload {
  name: string;
  leaderId: string;
  viceLeaderId: string | null;
  /** 셀 턴 종료일 (YYYY-MM-DD) */
  expiresAt: string;
  /** 커버(단체) 사진 — POST /uploads 주소, null = 사진 없음 */
  coverImageUrl: string | null;
}

// 셀 목록·상세·회원 소속이 전부 바뀔 수 있어서 셀 캐시를 통째로 무효화한다.
// (["cells"]가 목록, ["cells", id]가 상세 — 접두사 하나로 둘 다 걸린다.)
function useInvalidateCells() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["cells"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
  };
}

export function useCreateCell() {
  const invalidateCells = useInvalidateCells();
  return useMutation({
    mutationFn: (payload: CellFormPayload) =>
      apiClient.post<CellDetailResponse>("/cells", payload).then((res) => res.data),
    onSuccess: invalidateCells,
  });
}

export function useUpdateCell(cellId: string) {
  const invalidateCells = useInvalidateCells();
  return useMutation({
    mutationFn: (payload: CellFormPayload) =>
      apiClient
        .patch<CellDetailResponse>(`/cells/${cellId}`, payload)
        .then((res) => res.data),
    onSuccess: invalidateCells,
  });
}

export function useDeleteCell() {
  const invalidateCells = useInvalidateCells();
  return useMutation({
    mutationFn: (cellId: string) =>
      apiClient.delete<{ id: string }>(`/cells/${cellId}`).then((res) => res.data),
    onSuccess: invalidateCells,
  });
}

// 셀원 제거 — 관리자 또는 그 셀의 셀장/부셀장 (권한 검증은 서버).
export function useRemoveCellMember(cellId: string) {
  const invalidateCells = useInvalidateCells();
  return useMutation({
    mutationFn: (userId: string) =>
      apiClient
        .delete<{ id: string }>(`/cells/${cellId}/members/${userId}`)
        .then((res) => res.data),
    onSuccess: invalidateCells,
  });
}

// ---------------------------------------------------------------------
// 홈 배너 관리 — 활성 배너 = 최신 등록 1건, 내리기 = 삭제(이전 배너가 다시 표시).
// ---------------------------------------------------------------------

// 등록·삭제가 관리 목록과 홈 배너를 함께 바꾼다.
function useInvalidateBanners() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "banners"] });
    void queryClient.invalidateQueries({ queryKey: ["banner"] });
  };
}

export function useHomeBanners() {
  return useQuery({
    queryKey: ["admin", "banners"],
    queryFn: () =>
      apiClient.get<HomeBanner[]>("/notices/banners").then((res) => res.data),
  });
}

export function useCreateHomeBanner() {
  const invalidateBanners = useInvalidateBanners();
  return useMutation({
    mutationFn: (payload: CreateHomeBannerRequest) =>
      apiClient.post<HomeBanner>("/notices/banners", payload).then((res) => res.data),
    onSuccess: invalidateBanners,
  });
}

export function useUpdateHomeBanner(bannerId: string) {
  const invalidateBanners = useInvalidateBanners();
  return useMutation({
    mutationFn: (payload: UpdateHomeBannerRequest) =>
      apiClient
        .patch<HomeBanner>(`/notices/banners/${bannerId}`, payload)
        .then((res) => res.data),
    onSuccess: invalidateBanners,
  });
}

// 홈 표시 켜기/끄기 — 켜면 서버가 다른 배너를 꺼서 목록 전체가 바뀐다.
export function useSetHomeBannerActive() {
  const invalidateBanners = useInvalidateBanners();
  return useMutation({
    mutationFn: ({ bannerId, active }: { bannerId: string; active: boolean }) =>
      apiClient
        .put<HomeBanner>(`/notices/banners/${bannerId}/active`, { active })
        .then((res) => res.data),
    onSuccess: invalidateBanners,
  });
}

export function useDeleteHomeBanner() {
  const invalidateBanners = useInvalidateBanners();
  return useMutation({
    mutationFn: (bannerId: string) =>
      apiClient.delete(`/notices/banners/${bannerId}`).then((res) => res.data),
    onSuccess: invalidateBanners,
  });
}

// 모임 없는 날 — 그 달 일요일별 지정 상태. 지정/해제는 출석부·셀 출석 화면 데이터도 바꾸므로 같이 무효화한다.
export function useAdminOffDays(month: string) {
  return useQuery({
    queryKey: ["admin", "off-days", month],
    queryFn: () =>
      apiClient
        .get<AdminOffDaysResponse>("/admin/off-days", { params: { month } })
        .then((res) => res.data),
  });
}

export function useSetAdminOffDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      date,
      kind,
      confirm,
    }: {
      date: string;
      kind: OffDayKind | null;
      confirm?: boolean;
    }) => apiClient.put(`/admin/off-days/${date}`, { kind, confirm }).then((res) => res.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
      void queryClient.invalidateQueries({ queryKey: ["cell-attendance"] });
    },
  });
}

// 데이터 다운로드 전 미리보기 — 다운로드와 같은 쿼리(kind/scope/groupId/period/from/to)로 건수와 앞쪽 몇 줄을 받는다.
export type DownloadPreviewParams = Record<string, string>;

export function useAdminDownloadPreview(params: DownloadPreviewParams | null) {
  return useQuery({
    queryKey: ["admin", "download-preview", params],
    queryFn: () =>
      apiClient
        .get<AdminDownloadPreview>("/admin/download/preview", { params })
        .then((res) => res.data),
    enabled: params !== null,
  });
}
