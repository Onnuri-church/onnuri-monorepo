import type {
  AdminAttendanceResponse,
  AdminMemberDetail,
  AdminMemberSummary,
  CellDetailResponse,
  UpdateAdminMemberRequest,
} from "@onnuri/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "../../shared/api/client";

// 회원 목록 (관리자 전용 GET /users) — 회원 관리 목록과 셀장/부셀장 선택지가 같이 쓴다.
export function useAdminMembers() {
  return useQuery({
    queryKey: ["admin", "members"],
    queryFn: () =>
      apiClient.get<AdminMemberSummary[]>("/users").then((res) => res.data),
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
