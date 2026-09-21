import type { AdminMemberSummary, CellDetailResponse } from "@onnuri/shared";
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

/** 셀 생성/수정 공통 본문 — viceLeaderId null = 부셀장 없음(체크 해제) */
export interface CellFormPayload {
  name: string;
  leaderId: string;
  viceLeaderId: string | null;
  /** 셀 턴 종료일 (YYYY-MM-DD) */
  expiresAt: string;
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
