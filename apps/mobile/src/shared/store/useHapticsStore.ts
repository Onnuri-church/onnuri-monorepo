import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

const HAPTICS_KEY = "haptics-enabled";

interface HapticsState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

// "진동 효과" 켜짐 여부 — 기본 켜짐. 테마와 같은 이유로 SecureStore에 남긴다 (실패하면 무시).
export const useHapticsStore = create<HapticsState>((set) => ({
  enabled: true,
  setEnabled: (enabled) => {
    set({ enabled });
    SecureStore.setItemAsync(HAPTICS_KEY, enabled ? "1" : "0").catch(() => {});
  },
}));

// 앱 시작 때 한 번 — 저장된 값을 읽어 반영한다.
export async function restoreHapticsEnabled(): Promise<void> {
  try {
    const saved = await SecureStore.getItemAsync(HAPTICS_KEY);
    if (saved === "0" || saved === "1") useHapticsStore.setState({ enabled: saved === "1" });
  } catch {
    // 저장소가 없는 환경(웹 등) — 켜짐으로 시작한다.
  }
}
