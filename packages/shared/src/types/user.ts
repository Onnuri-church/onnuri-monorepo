// DB 스키마(apps/api/prisma/schema.prisma)의 User를 따른다 (docs/erd.md 참고).
// 등급은 isAdmin + 멤버십 역할(CellRole/TeamRole)로 표현한다.

export type Gender = "MALE" | "FEMALE";

/** 셀 멤버십 역할. 부셀장(SUB_LEADER)은 셀장과 동일 권한 — 표시만 구분한다. */
export type CellRole = "LEADER" | "SUB_LEADER" | "MEMBER";

export type TeamRole = "LEADER" | "MEMBER";

export interface User {
  id: string;
  name: string;
  /** ISO date (YYYY-MM-DD). 나이는 계산한다. */
  birthDate: string | null;
  gender: Gender | null;
  /** 연락처 — 프로필에서 직접 입력 (본인인증 없음) */
  phone: string | null;
  avatarUrl: string | null;
  /** 한 줄 소개 */
  intro: string | null;
  /** 관리자(임원) — 임원이 수동 지정 */
  isAdmin: boolean;
  createdAt: string;
}
