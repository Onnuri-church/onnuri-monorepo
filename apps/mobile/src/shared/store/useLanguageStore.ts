import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

import { i18n, type LanguageCode } from "../i18n";

const LANGUAGE_KEY = "language";

interface LanguageState {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
}

// 선택한 언어는 기기에 남긴다 (테마와 같은 이유로 SecureStore — 실패하면 무시하고 다음 실행엔 한국어로 시작).
export const useLanguageStore = create<LanguageState>((set) => ({
  language: "ko",
  setLanguage: (language) => {
    set({ language });
    void i18n.changeLanguage(language);
    SecureStore.setItemAsync(LANGUAGE_KEY, language).catch(() => {});
  },
}));

const CODES: readonly string[] = ["ko", "en"];

// 앱 시작 때 한 번 — 저장된 언어를 읽어 반영한다.
export async function restoreLanguage(): Promise<void> {
  try {
    const saved = await SecureStore.getItemAsync(LANGUAGE_KEY);
    if (saved && CODES.includes(saved)) {
      useLanguageStore.setState({ language: saved as LanguageCode });
      await i18n.changeLanguage(saved);
    }
  } catch {
    // 저장소가 없는 환경(웹 등) — 한국어로 시작한다.
  }
}
