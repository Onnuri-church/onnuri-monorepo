// DB 스키마(apps/api/prisma/schema.prisma)의 Cell·CellMembership을 따른다 (docs/erd.md 참고).
// 셀 목록 요약(CellSummary)은 프로필 설정과 같이 쓰는 계약이라 user.ts에 있다.

import type { CellRole } from "./user";

/** GET /cells/:id 응답의 구성원 한 명 — 진행 중(endedAt 없음) 멤버십 기준 */
export interface CellMemberInfo {
  /** userId */
  id: string;
  name: string;
  avatarUrl: string | null;
  role: CellRole;
}

/**
 * GET /cells/:id 응답 — 개별 셀 페이지(헤더·구성원 탭)가 쓴다.
 * 구성원은 셀장 → 부셀장 → 셀원(이름순)으로 정렬돼 내려온다.
 */
export interface CellDetailResponse {
  id: string;
  name: string;
  coverImageUrl: string | null;
  /** ISO date (YYYY-MM-DD) */
  startedAt: string;
  /** ISO date — 유통기한(활동 종료 예정일) */
  expiresAt: string;
  members: CellMemberInfo[];
}
