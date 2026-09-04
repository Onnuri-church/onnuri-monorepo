// DB 스키마(apps/api/prisma/schema.prisma)의 User를 따른다. legacy 표시 필드는 소셜 로그인
// 전환 시 스키마와 함께 제거한다 (docs/erd.md 참고).

/** legacy: isAdmin + 멤버십 역할(CellRole/TeamRole)로 대체 예정. auth 연동 전까지만 유지. */
export type UserRole = "member" | "team_leader" | "admin";

export type Gender = "MALE" | "FEMALE";

/** 셀 멤버십 역할. 부셀장(SUB_LEADER)은 셀장과 동일 권한 — 표시만 구분한다. */
export type CellRole = "LEADER" | "SUB_LEADER" | "MEMBER";

export type TeamRole = "LEADER" | "MEMBER";

export interface User {
  id: string;
  name: string;
  /** legacy: CellMembership으로 대체 예정 */
  cellName: string | null;
  /** legacy: TeamMembership으로 대체 예정 */
  teamId: string | null;
  /** legacy */
  role: UserRole;
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
