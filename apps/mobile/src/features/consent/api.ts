import type { UpdateConsentRequest, User } from "@onnuri/shared";

import { apiClient } from "../../shared/api/client";
import { queryClient } from "../../shared/api/queryClient";
import { signOut } from "../../shared/api/session";
import { clearTokens } from "../../shared/api/tokenStorage";
import { useAuthStore } from "../../shared/store/useAuthStore";

// 개인정보처리방침 전문 — 교회가 노션에 게시한 공개 페이지 (스토어에 등록한 주소와 같다).
export const PRIVACY_POLICY_URL =
  "https://jihwan0713navercom.notion.site/3fa542358c0580b991c9cbafc575cc49";

// 동의를 저장하고 세션의 유저를 새 값으로 바꾼다 — RootNavigator가 privacyConsented를 보고
// 동의 화면을 걷어낸다. 프로필을 아직 안 마쳤으면 onboarding(프로필 설정)으로 이어진다.
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
