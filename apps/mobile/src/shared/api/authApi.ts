import axios from "axios";

import type { AuthTokens, DevLoginRole, LoginResponse, User } from "@onnuri/shared";

import { API_BASE_URL } from "./config";

// 인터셉터 없는 인스턴스를 따로 쓴다 — apiClient의 401 → refresh 재시도 로직이
// refresh 요청 자신에게 다시 걸려 무한 루프가 되는 것을 막는다.
const bareClient = axios.create({ baseURL: API_BASE_URL });

export function postKakaoLogin(kakaoAccessToken: string): Promise<LoginResponse> {
  return bareClient
    .post<LoginResponse>("/auth/login/kakao", { token: kakaoAccessToken })
    .then((res) => res.data);
}

export function postGoogleLogin(googleIdToken: string): Promise<LoginResponse> {
  return bareClient
    .post<LoginResponse>("/auth/login/google", { token: googleIdToken })
    .then((res) => res.data);
}

// 개발용 로그인 — 백엔드가 AUTH_DEV_LOGIN=true인 환경에서만 응답한다 (아니면 404).
export function postDevLogin(email: string, role: DevLoginRole): Promise<LoginResponse> {
  return bareClient
    .post<LoginResponse>("/auth/login/dev", { email, role })
    .then((res) => res.data);
}

export function postRefresh(refreshToken: string): Promise<AuthTokens> {
  return bareClient.post<AuthTokens>("/auth/refresh", { refreshToken }).then((res) => res.data);
}

export function postLogout(refreshToken: string): Promise<void> {
  return bareClient.post("/auth/logout", { refreshToken }).then(() => undefined);
}

// 세션 복원 중에는 스토어가 아직 authenticated가 아니라 apiClient의 요청 인터셉터가
// 토큰을 못 붙인다 — 토큰을 인자로 직접 받는다.
export function getMe(accessToken: string): Promise<User> {
  return bareClient
    .get<User>("/users/me", { headers: { Authorization: `Bearer ${accessToken}` } })
    .then((res) => res.data);
}
