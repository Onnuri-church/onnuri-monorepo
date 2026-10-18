import * as SecureStore from "expo-secure-store";

export type LastLoginProvider = "kakao" | "google";

const LAST_LOGIN_KEY = "last-login-provider";

// "최근 로그인" 툴팁용 — 마지막으로 성공한 소셜 로그인 수단을 기기에 남긴다. 테마 선택값과 같은 이유로
// SecureStore를 쓰고, 읽기·쓰기가 실패해도 툴팁이 안 뜰 뿐이라 조용히 넘어간다.
export async function loadLastLoginProvider(): Promise<LastLoginProvider | null> {
  try {
    const saved = await SecureStore.getItemAsync(LAST_LOGIN_KEY);
    return saved === "kakao" || saved === "google" ? saved : null;
  } catch {
    return null;
  }
}

export function saveLastLoginProvider(provider: LastLoginProvider): void {
  SecureStore.setItemAsync(LAST_LOGIN_KEY, provider).catch(() => {});
}
