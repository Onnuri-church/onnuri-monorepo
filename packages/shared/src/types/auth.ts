import type { User } from "./user";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * POST /auth/login/dev의 role — 개발용 로그인이 로그인하면서 세팅해주는 등급.
 * 실제 등급은 isAdmin·멤버십 역할(TeamRole/CellRole)로 표현되므로 이 값은 개발용 API에만 있다.
 */
export const DEV_LOGIN_ROLES = ["MEMBER", "TEAM_LEADER", "CELL_LEADER", "ADMIN"] as const;
export type DevLoginRole = (typeof DEV_LOGIN_ROLES)[number];

/**
 * POST /auth/login/kakao·google 응답.
 * POST /auth/refresh 응답은 AuthTokens만이다 (리프레시 토큰은 매번 회전됨).
 */
export interface LoginResponse extends AuthTokens {
  /** 이번 로그인으로 계정이 새로 만들어졌는지 — 프로필 설정 화면 분기 기준 */
  isNewUser: boolean;
  user: User;
}
