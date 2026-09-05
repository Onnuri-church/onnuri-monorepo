import type { User } from "./user";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * POST /auth/login/kakao·google 응답.
 * POST /auth/refresh 응답은 AuthTokens만이다 (리프레시 토큰은 매번 회전됨).
 */
export interface LoginResponse extends AuthTokens {
  /** 이번 로그인으로 계정이 새로 만들어졌는지 — 프로필 설정 화면 분기 기준 */
  isNewUser: boolean;
  user: User;
}
