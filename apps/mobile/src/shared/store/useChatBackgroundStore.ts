import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

// 채팅방 배경색 — 내 폰에만 저장하고 방마다 따로 고른다 (SCRUM-229).
// 저장소는 테마와 같은 이유로 이미 들어 있는 SecureStore를 쓴다 (AsyncStorage는 새 빌드가 필요).
const BACKGROUND_KEY = "chat-backgrounds";

export const CHAT_BACKGROUNDS = {
  // 기본 — 흰 바탕은 눈이 부셔서 살짝 어두운 회색으로. 남의 말풍선(흰색)과 구분된다.
  default: { label: "기본", light: "#EEF0F3", dark: "#0D100E" },
  mint: { label: "민트", light: "#E2F1E9", dark: "#15211B" },
  sky: { label: "하늘", light: "#DFEAF5", dark: "#131B24" },
  lavender: { label: "라벤더", light: "#ECE6F6", dark: "#1C1826" },
  peach: { label: "피치", light: "#F8E9DF", dark: "#271C16" },
  sand: { label: "샌드", light: "#F2EDDC", dark: "#221F18" },
  gray: { label: "그레이", light: "#DEDFE2", dark: "#1A1C1E" },
  white: { label: "화이트", light: "#FFFFFF", dark: "#121614" },
} as const;

export type ChatBackgroundId = keyof typeof CHAT_BACKGROUNDS;

interface ChatBackgroundState {
  /** "room:<id>" 같은 방 키 → 고른 배경 (없으면 기본) */
  byRoom: Record<string, ChatBackgroundId>;
  setBackground: (roomKey: string, id: ChatBackgroundId) => void;
}

export const useChatBackgroundStore = create<ChatBackgroundState>((set, get) => ({
  byRoom: {},
  setBackground: (roomKey, id) => {
    const next = { ...get().byRoom };
    if (id === "default") delete next[roomKey];
    else next[roomKey] = id;
    set({ byRoom: next });
    SecureStore.setItemAsync(BACKGROUND_KEY, JSON.stringify(next)).catch(() => {});
  },
}));

// 앱 시작 때 한 번 — 저장된 방별 배경을 읽어 온다.
export async function restoreChatBackgrounds(): Promise<void> {
  try {
    const saved = await SecureStore.getItemAsync(BACKGROUND_KEY);
    if (!saved) return;
    const parsed = JSON.parse(saved) as Record<string, string>;
    const byRoom: Record<string, ChatBackgroundId> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value in CHAT_BACKGROUNDS) byRoom[key] = value as ChatBackgroundId;
    }
    useChatBackgroundStore.setState({ byRoom });
  } catch {
    // 저장소가 없거나 깨졌으면 기본 배경으로 시작한다.
  }
}
