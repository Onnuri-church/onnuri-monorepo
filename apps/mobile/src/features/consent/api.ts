import type { UpdateConsentRequest, User } from "@onnuri/shared";

import { apiClient } from "../../shared/api/client";
import { queryClient } from "../../shared/api/queryClient";
import { signOut } from "../../shared/api/session";
import { clearTokens } from "../../shared/api/tokenStorage";
import { useAuthStore } from "../../shared/store/useAuthStore";

export async function submitConsent(body: UpdateConsentRequest): Promise<User> {
  const user = await apiClient.patch<User>("/users/me/consent", body).then((res) => res.data);
  void queryClient.invalidateQueries({ queryKey: ["me"] });

  const { session, setSession, startOnboarding } = useAuthStore.getState();
  if (session.status === "authenticated" || session.status === "onboarding") {
    const tokens = { accessToken: session.accessToken, refreshToken: session.refreshToken };
    if (user.profileCompleted) setSession(user, tokens);
    else startOnboarding(user, tokens);
  }
  return user;
}

// "동의하지 않고 나가기" (SCRUM-183) — 막 가입한 계정이면 서버가 계정을 지운다. 지워졌으면 서버 쪽
// 토큰도 이미 없으니 로컬만 정리하고, 기존 회원이라 남았으면 평소 로그아웃(푸시 해제·토큰 무효화)을 한다.
// 요청이 실패해도(네트워크 등) 나가기는 막지 않는다 — 로그아웃으로 처리한다.
export async function declineConsent(): Promise<void> {
  const deleted = await apiClient
    .post<{ deleted: boolean }>("/users/me/consent/decline")
    .then((res) => res.data.deleted)
    .catch(() => false);
  if (!deleted) {
    await signOut();
    return;
  }
  await clearTokens();
  useAuthStore.getState().clearSession();
  queryClient.clear();
}
