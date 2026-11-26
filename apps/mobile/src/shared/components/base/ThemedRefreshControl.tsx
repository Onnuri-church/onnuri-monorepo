import { RefreshControl, type RefreshControlProps } from "react-native";

import { useThemeColors } from "../../theme/useThemeColors";

// 당겨서 새로고침 표시를 현재 테마 색으로 그린다 (SCRUM-280). 기본 RefreshControl은 색을 안 주면
// iOS는 짙은 회색, 안드로이드는 흰 원 + 검정 화살표라 다크모드의 어두운 바탕에서 잘 안 보인다.
// ScrollView가 refreshControl 요소를 복제해 style·children을 넣으므로 받은 props는 그대로 넘긴다.
export function ThemedRefreshControl(props: RefreshControlProps) {
  const themeColors = useThemeColors();
  return (
    <RefreshControl
      tintColor={themeColors.icon.strong}
      colors={[themeColors.primary.normal]}
      progressBackgroundColor={themeColors.background.normal}
      {...props}
    />
  );
}
