import * as SecureStore from "expo-secure-store";

import type { AuthTokens } from "@onnuri/shared";

// 토큰은 AsyncStorage가 아니라 SecureStore(키체인/키스토어)에 둔다 — 평문 저장 금지.
const TOKENS_KEY = "auth-tokens";

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens));
}

export async function loadTokens(): Promise<AuthTokens | null> {
  const raw = await SecureStore.getItemAsync(TOKENS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthTokens;
  } catch {
    return null;
  }
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKENS_KEY);
}
