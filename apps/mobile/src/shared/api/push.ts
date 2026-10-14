import type { RegisterPushTokenRequest } from "@onnuri/shared";

import { apiClient } from "./client";

// 이 앱 실행에서 서버에 등록한 기기 토큰. 로그아웃 때 해제할 대상을 기억한다 —
// 토큰 발급은 features/notification의 등록 게이트가 하고, 여기는 서버 왕복만 담당한다.
let registeredToken: string | null = null;

export async function registerPushToken(token: string): Promise<void> {
  const payload: RegisterPushTokenRequest = { token };
  await apiClient.patch("/users/me/push-token", payload);
  registeredToken = token;
}

// 로그아웃하는 기기의 토큰 해제 — 안 지우면 로그아웃한 계정의 알림이 이 기기로 계속 온다.
// 세션을 지우기 전에 불러야 한다 (요청에 액세스 토큰이 필요하다).
export async function unregisterPushToken(): Promise<void> {
  if (!registeredToken) return;
  const payload: RegisterPushTokenRequest = { token: registeredToken };
  registeredToken = null;
  await apiClient.delete("/users/me/push-token", { data: payload });
}
