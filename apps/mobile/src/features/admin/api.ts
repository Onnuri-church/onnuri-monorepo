import type {
  AdminFollowerNoteOverview,
  AdminAttendanceMark,
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
  UpdateAdminAttendanceRequest,
  UpdateAdminMemberRequest,
} from "@onnuri/shared";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "../../shared/api/client";

// 출석부 칸 수정 (관리자 전용 PUT /admin/attendance) — 날짜 제한 없이 예배·셀모임 출석을 대신 고친다.
// 누르는 순간 표를 먼저 바꾸고 저장은 뒤에서 한다 (SCRUM-244) — 예전엔 저장 + 표 다시 받기가 끝나야
// 체크가 바뀌어 느렸다. 실패하면 원래 표로 돌린다. 연달아 누른 저장이 다 끝난 뒤에만 다시 받는다.
const UPDATE_ATTENDANCE_KEY = ["admin", "attendance", "update"];

function applyMark(
  data: AdminAttendanceResponse | undefined,
  body: UpdateAdminAttendanceRequest,
): AdminAttendanceResponse | undefined {
  if (!data) return data;
  const weekIndex = data.dateKeys.indexOf(body.date);
  if (weekIndex < 0) return data;
  const toMark = (attended: boolean | undefined, current: AdminAttendanceMark) =>
    attended === undefined ? current : attended ? "O" : "X";
  return {
    ...data,
    groups: data.groups.map((group) => ({
      ...group,
      rows: group.rows.map((row) =>
        row.id !== body.userId
          ? row
          : {
              ...row,
              weeks: row.weeks.map((week, index) =>
                index !== weekIndex
                  ? week
                  : ([toMark(body.worship, week[0]), toMark(body.meeting, week[1])] as [
                      AdminAttendanceMark,
                      AdminAttendanceMark,
                    ]),
              ),
            },
      ),
    })),
  };
}

export function useUpdateAdminAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: UPDATE_ATTENDANCE_KEY,
    mutationFn: (body: UpdateAdminAttendanceRequest) =>
      apiClient
        .put<{ worship: boolean; meeting: boolean }>("/admin/attendance", body)
        .then((res) => res.data),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: ["admin", "attendance"] });
      const snapshot = queryClient.getQueriesData<AdminAttendanceResponse>({
        queryKey: ["admin", "attendance"],
      });
      queryClient.setQueriesData<AdminAttendanceResponse>(
        { queryKey: ["admin", "attendance"] },
        (data) => applyMark(data, body),
      );
      return { snapshot };
    },
    onError: (_error, _body, context) => {
      context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: UPDATE_ATTENDANCE_KEY }) > 1) return;
      void queryClient.invalidateQueries({ queryKey: ["admin", "attendance"] });
      void queryClient.invalidateQueries({ queryKey: ["cell-attendance"] });
    },
  });
}

// 회원 목록 (관리자 전용 GET /users) — 회원 관리 목록과 셀장/부셀장 선택지가 같이 쓴다.
export function useAdminMembers(enabled = true) {
  return useQuery({
    queryKey: ["admin", "members"],
    queryFn: () => apiClient.get<AdminMemberSummary[]>("/users").then((res) => res.data),
    // GET /users는 관리자 전용 — 비관리자 화면(소그룹 수정의 소그룹장)에서는 요청 자체를 끈다.
    enabled,
  });
}

// 회원 상세 (관리자 전용 GET /users/:id) — 상세 화면 문구 + 편집 프리필 원본.
export function useAdminMember(memberId: string) {
  return useQuery({
    queryKey: ["admin", "members", memberId],
    queryFn: () => apiClient.get<AdminMemberDetail>(`/users/${memberId}`).then((res) => res.data),
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
      apiClient.patch<AdminMemberDetail>(`/users/${memberId}`, payload).then((res) => res.data),
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
    queryFn: () => fetchAdminAttendance(params),
    // 셀·멤버 구성이 바뀐 직후에도 최신이 보이도록 캐시를 쓰지 않는다 (기본 staleTime 1분).
    staleTime: 0,
    // 달·필터를 바꾸는 동안 이전 표를 유지한다 — 빈 화면이 깜빡이지 않게 (SCRUM-239).
    placeholderData: keepPreviousData,
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
      apiClient.patch<CellDetailResponse>(`/cells/${cellId}`, payload).then((res) => res.data),
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

// 셀원 추가 — 관리자 전용. 다른 셀에 있던 회원은 이 셀로 옮겨진다.
export function useAddCellMembers(cellId: string) {
  const invalidateCells = useInvalidateCells();
  return useMutation({
    mutationFn: (userIds: string[]) =>
      apiClient
        .post<{ added: number }>(`/cells/${cellId}/members`, { userIds })
        .then((res) => res.data),
    onSuccess: invalidateCells,
  });
}

// 셀원 제거 — 관리자 전용 (권한 검증은 서버).
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
    queryFn: () => apiClient.get<HomeBanner[]>("/notices/banners").then((res) => res.data),
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
      apiClient.patch<HomeBanner>(`/notices/banners/${bannerId}`, payload).then((res) => res.data),
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
export function fetchAdminOffDays(month: string): Promise<AdminOffDaysResponse> {
  return apiClient
    .get<AdminOffDaysResponse>("/admin/off-days", { params: { month } })
    .then((res) => res.data);
}

export function fetchAdminAttendance(
  params: AdminAttendanceParams,
): Promise<AdminAttendanceResponse> {
  return apiClient
    .get<AdminAttendanceResponse>("/admin/attendance", { params })
    .then((res) => res.data);
}

// 앞뒤 달을 미리 받아 둔다 — 월 토글로 옆 달을 고르면 바로 보이게 (SCRUM-239).
export function neighborMonths(month: string): string[] {
  const [year, monthOfYear] = month.split("-").map(Number);
  const shift = (delta: number) => {
    const date = new Date(year, monthOfYear - 1 + delta, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  };
  return [shift(-1), shift(1)];
}

export function useAdminOffDays(month: string) {
  return useQuery({
    queryKey: ["admin", "off-days", month],
    queryFn: () => fetchAdminOffDays(month),
    // 달을 바꾸는 동안 이전 목록을 유지한다 (SCRUM-239)
    placeholderData: keepPreviousData,
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

// 팔로워 노트 관리 (SCRUM-181) — 셀·팀 목록과 노트 수·새 노트 수. 게시판을 다녀오면 새 노트 수가 바뀌므로
// 화면이 다시 보일 때마다 새로 받는다 (화면 쪽 useFocusEffect).
export function useAdminFollowerNoteOverview() {
  return useQuery({
    queryKey: ["admin-follower-notes"],
    queryFn: () =>
      apiClient.get<AdminFollowerNoteOverview>("/admin/follower-notes").then((res) => res.data),
  });
}

// 이용 정지·해제 (관리자 전용, SCRUM-204) — 회원 상세와 신고 관리가 같이 쓴다.
// 신고 목록의 "작성자 정지 중" 표시도 바뀌므로 신고 캐시도 다시 받는다.
export function useSuspendMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, days }: { memberId: string; days: 7 | 30 | null }) =>
      apiClient
        .put<AdminMemberDetail>(`/users/${memberId}/suspension`, days ? { days } : {})
        .then((res) => res.data),
    onSuccess: (detail) => {
      queryClient.setQueryData(["admin", "members", detail.id], detail);
      void queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
    },
  });
}

export function useLiftMemberSuspension() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) =>
      apiClient.delete<AdminMemberDetail>(`/users/${memberId}/suspension`).then((res) => res.data),
    onSuccess: (detail) => {
      queryClient.setQueryData(["admin", "members", detail.id], detail);
      void queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
    },
  });
}
