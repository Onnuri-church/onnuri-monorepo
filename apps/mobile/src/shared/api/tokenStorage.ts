import * as SecureStore from "expo-secure-store";

import type { AuthTokens } from "@onnuri/shared";

// 토큰은 AsyncStorage가 아니라 SecureStore(키체인/키스토어)에 둔다 — 평문 저장 금지.
// SecureStore는 네이티브 전용이라 웹(개발용 미리보기)에서는 호출 자체가 throw한다.
// 저장소 실패는 "저장된 세션 없음"으로 취급해 앱이 죽지 않게 한다 — 그런 환경에서는
// 재시작 시 세션이 유지되지 않을 뿐, 게스트 둘러보기와 화면 확인은 정상 동작한다.
const TOKENS_KEY = "auth-tokens";

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens));
  } catch {
    // 저장 실패여도 로그인 자체는 진행된다 — 다음 부팅에 복원이 안 될 뿐이다.
  }
}

export async function loadTokens(): Promise<AuthTokens | null> {
  try {
    const raw = await SecureStore.getItemAsync(TOKENS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthTokens;
  } catch {
    return null;
  }
}

export async function clearTokens(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKENS_KEY);
  } catch {
    // 저장소가 없는 환경(웹 등) — 지울 것도 없으므로 무시한다.
  }
}
