import type { CellDetailResponse, CellRole, CellSummary } from "@onnuri/shared";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "../../shared/api/client";
import { fetchCells } from "../profile/api";
import type { CellMemberRole } from "./cellDetail";

export function fetchCellDetail(cellId: string): Promise<CellDetailResponse> {
  return apiClient.get<CellDetailResponse>(`/cells/${cellId}`).then((res) => res.data);
}

// 전체 셀 목록 — 프로필 설정 선택지와 같은 GET /cells라 쿼리 키도 공유한다 (한 번 받으면 둘 다 씀).
export function useCells() {
  return useQuery({ queryKey: ["cells"], queryFn: fetchCells });
}

// 헤더 제목처럼 셀 하나의 요약만 필요한 화면용 — 목록 캐시에서 찾는다 (별도 요청 없음).
export function useCell(cellId: string): CellSummary | undefined {
  const { data } = useCells();
  return data?.find((cell) => cell.id === cellId);
}

// 개별 셀 페이지(구성원 탭·셀원 관리·출석 명단)용 상세 조회.
export function useCellDetail(cellId: string) {
  return useQuery({ queryKey: ["cells", cellId], queryFn: () => fetchCellDetail(cellId) });
}

// 서버 enum(CellRole) → 셀 화면들의 표시 역할. 부셀장은 셀장과 동일 권한 — 표시만 구분 (docs/erd.md).
export function toCellMemberRole(role: CellRole): CellMemberRole {
  return role === "LEADER" ? "leader" : role === "SUB_LEADER" ? "viceLeader" : "member";
}
