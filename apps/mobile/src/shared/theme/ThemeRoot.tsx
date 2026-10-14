import { vars } from "nativewind";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { View } from "react-native";

import { useThemeStore } from "../store/useThemeStore";
import { themeVars } from "./tokens";

// 앱 최상단 — 선택한 테마의 색 변수(--c-*)를 자식 전체에 공급한다. className의 색(bg-…, text-…)이
// 전부 이 변수를 참조하므로 화면 코드를 고치지 않아도 테마가 바뀐다.
// BottomSheetModalProvider 같은 포털 호스트도 이 안에 있어야 시트 내용에 변수가 닿는다.
// 상태바 글자색은 바탕과 반대로 둔다 (스플래시·로그인처럼 화면이 직접 StatusBar를 그리는 곳은 그쪽이 이긴다).
export function ThemeRoot({ children }: { children: ReactNode }) {
  const mode = useThemeStore((state) => state.mode);

  return (
    <View style={[{ flex: 1 }, vars(themeVars[mode] as Record<`--${string}`, string>)]}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      {children}
    </View>
  );
}
