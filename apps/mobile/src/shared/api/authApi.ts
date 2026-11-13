import axios from "axios";

import type { AuthTokens, DevLoginRole, LoginResponse, User } from "@onnuri/shared";

import { API_BASE_URL, API_TIMEOUT_MS } from "./config";

// 인터셉터 없는 인스턴스를 따로 쓴다 — apiClient의 401 → refresh 재시도 로직이
// refresh 요청 자신에게 다시 걸려 무한 루프가 되는 것을 막는다.
const bareClient = axios.create({ baseURL: API_BASE_URL, timeout: API_TIMEOUT_MS });

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

// Apple 로그인 (SCRUM-200) — 이름은 애플이 첫 로그인 때만 앱에 주므로 같이 보낸다.
export function postAppleLogin(identityToken: string, name?: string): Promise<LoginResponse> {
  return bareClient
    .post<LoginResponse>("/auth/login/apple", { token: identityToken, name })
    .then((res) => res.data);
}

// 개발용 로그인 — 백엔드가 AUTH_DEV_LOGIN=true인 환경에서만 응답한다 (아니면 404).
// 백엔드 AUTH_DEV_LOGIN_SECRET과 같은 값을 헤더로 보내야 한다 (틀리면 401). EXPO_PUBLIC_ 값은
// 번들에 그대로 박히므로 개발용 .env에만 넣고 preview/production 빌드에는 넣지 않는다.
export function postDevLogin(email: string, role: DevLoginRole): Promise<LoginResponse> {
  return bareClient
    .post<LoginResponse>(
      "/auth/login/dev",
      { email, role },
      { headers: { "X-Dev-Login-Secret": process.env.EXPO_PUBLIC_AUTH_DEV_LOGIN_SECRET ?? "" } },
    )
    .then((res) => res.data);
}

// 스토어 심사용 로그인 (SCRUM-197) — 서버에 심사용 아이디·비밀번호가 없으면 404.
export function postReviewLogin(id: string, password: string): Promise<LoginResponse> {
  return bareClient
    .post<LoginResponse>("/auth/login/review", { id, password })
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
