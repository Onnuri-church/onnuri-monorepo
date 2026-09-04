import type { AuthTokens, LoginResponse, User } from "@onnuri/shared";

import { useAuthStore } from "../store/useAuthStore";
import {
  getMe,
  postDevLogin,
  postGoogleLogin,
  postKakaoLogin,
  postLogout,
  postRefresh,
} from "./authApi";
import { clearTokens, loadTokens, saveTokens } from "./tokenStorage";

// 로그인 응답 → 토큰 저장 → 세션 시작. isNewUser로 프로필 설정 화면 분기를 판단한다.
async function startSession({
  accessToken,
  refreshToken,
  isNewUser,
  user,
}: LoginResponse): Promise<{ isNewUser: boolean }> {
  const tokens = { accessToken, refreshToken };
  await saveTokens(tokens);
  useAuthStore.getState().setSession(user, tokens);
  return { isNewUser };
}

// 소셜 로그인. providerToken은 SDK가 발급받은 카카오 액세스 토큰/구글 ID 토큰이다.
export async function signInWithSocial(
  provider: "kakao" | "google",
  providerToken: string,
): Promise<{ isNewUser: boolean }> {
  const login = provider === "kakao" ? postKakaoLogin : postGoogleLogin;
  return startSession(await login(providerToken));
}

// 개발용 로그인 — 소셜 SDK가 없는 웹/Expo Go에서 유저 기반 기능을 확인하기 위한 것.
// 백엔드가 AUTH_DEV_LOGIN=true인 환경에서만 응답한다.
export async function signInWithDev(email: string): Promise<{ isNewUser: boolean }> {
  return startSession(await postDevLogin(email));
}

// 앱 부팅 시 저장된 토큰으로 세션을 복원한다. 세션 확정(setSession/clearSession)은
// useAppBootstrap이 스플래시 최소 노출 시간과 맞춰서 하므로 여기서는 결과만 돌려준다.
export async function restoreSession(): Promise<{ user: User; tokens: AuthTokens } | null> {
  const tokens = await refreshSession();
  if (!tokens) return null;

  try {
    const user = await getMe(tokens.accessToken);
    return { user, tokens };
  } catch {
    // 일시적 실패(네트워크 등)일 수 있으므로 저장된 토큰은 지우지 않는다 — 다음 부팅에 재시도된다.
    return null;
  }
}

export async function signOut(): Promise<void> {
  const stored = await loadTokens();
  await clearTokens();
  useAuthStore.getState().clearSession();
  if (stored) {
    // 서버 쪽 무효화는 최선 노력 — 실패해도 로컬 세션은 이미 정리됐다.
    postLogout(stored.refreshToken).catch(() => undefined);
  }
}

// 리프레시 토큰은 한 번 쓰면 회전되므로, 동시에 여러 401이 나도 refresh는 한 번만 나가야 한다.
let refreshInFlight: Promise<AuthTokens | null> | null = null;

export function refreshSession(): Promise<AuthTokens | null> {
  refreshInFlight ??= doRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function doRefresh(): Promise<AuthTokens | null> {
  const stored = await loadTokens();
  if (!stored) return null;

  try {
    const tokens = await postRefresh(stored.refreshToken);
    await saveTokens(tokens);

    // 이미 로그인된 상태라면(401 재시도 경로) 스토어의 토큰도 갈아끼운다.
    const { session, setSession } = useAuthStore.getState();
    if (session.status === "authenticated") {
      setSession(session.user, tokens);
    }
    return tokens;
  } catch {
    // 만료·회수된 리프레시 토큰 — 다시 로그인해야 하므로 지운다.
    await clearTokens();
    return null;
  }
}
