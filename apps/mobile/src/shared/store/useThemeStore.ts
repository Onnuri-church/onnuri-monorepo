import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

export type ThemeMode = "light" | "dark";

const THEME_KEY = "theme-mode";

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

// 선택한 테마는 기기에 남긴다. AsyncStorage는 네이티브 모듈이라 개발 빌드를 다시 만들어야 해서,
// 이미 들어 있는 SecureStore를 쓴다 (토큰 저장소와 같은 이유로 실패하면 무시 — 다음 실행에 라이트로 시작할 뿐).
export const useThemeStore = create<ThemeState>((set) => ({
  mode: "light",
  setMode: (mode) => {
    set({ mode });
    SecureStore.setItemAsync(THEME_KEY, mode).catch(() => {});
  },
}));

// 앱 시작 때 한 번 — 저장된 값을 읽어 반영한다.
export async function restoreThemeMode(): Promise<void> {
  try {
    const saved = await SecureStore.getItemAsync(THEME_KEY);
    if (saved === "light" || saved === "dark") useThemeStore.setState({ mode: saved });
  } catch {
    // 저장소가 없는 환경(웹 등) — 라이트로 시작한다.
  }
}
