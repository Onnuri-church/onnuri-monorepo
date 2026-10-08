import { useThemeStore } from "../store/useThemeStore";
import { colors as lightColors, darkColors } from "./tokens";

export type ThemeColors = typeof lightColors;

// className을 못 쓰는 곳(아이콘 color, placeholderTextColor, StyleSheet 값 등)에서 현재 테마의
// 색을 얻는다. `colors`를 직접 import하면 라이트 값으로 고정되므로, 렌더 중에 쓰는 값은 이 훅을 쓴다.
export function useThemeColors(): ThemeColors {
  const mode = useThemeStore((state) => state.mode);
  return mode === "dark" ? darkColors : lightColors;
}

// 라이트 hex → 현재 테마 hex. Icon처럼 호출부가 `colors.x.y`(라이트 값)를 그대로 넘기는 곳을
// 호출부 수정 없이 테마에 맞추기 위한 역조회다. 같은 라이트 값이 여러 토큰에 있으면(흰색 #FFFFFF는
// background.normal·icon.disable·text.disable…) 다크 값이 갈리므로, 아이콘이 쓰는 그룹(icon → text →
// semantic → primary)을 먼저 담아 그쪽 값이 이기게 한다 (예: 초록 FAB 위 흰 아이콘 = icon.disable).
const lightToDark = new Map<string, string>();
const GROUP_PRIORITY = ["icon", "text", "semantic", "primary", "chip", "background"] as const;
for (const group of GROUP_PRIORITY) {
  const light = lightColors[group] as Record<string, string>;
  const dark = darkColors[group] as Record<string, string>;
  for (const key of Object.keys(light)) {
    if (!lightToDark.has(light[key].toLowerCase())) lightToDark.set(light[key].toLowerCase(), dark[key]);
  }
}

export function themedColor(hex: string, mode: "light" | "dark"): string {
  if (mode === "light") return hex;
  return lightToDark.get(hex.toLowerCase()) ?? hex;
}
