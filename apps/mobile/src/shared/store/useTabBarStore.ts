import { create } from "zustand";

// 하단 탭바 숨김 상태 (스크롤 내리면 숨기고 올리면 다시 보이는 동작용).
// 내비게이션이 소유한 상태가 아니라 우리가 만든 UI 상태라서 Zustand 규칙(DESIGN.md)과 충돌하지 않는다.
// 값을 바꾸는 쪽은 useHideTabBarOnScroll 훅, 구독하는 쪽은 BottomNav 하나다.
interface TabBarState {
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
}

export const useTabBarStore = create<TabBarState>((set) => ({
  hidden: false,
  setHidden: (hidden) => set({ hidden }),
}));
