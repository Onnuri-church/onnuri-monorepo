import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { useThemeColors } from "../../../shared/theme/useThemeColors";

// 마지막에 쓴 로그인 버튼 위에 얹는 말풍선 (시안 Tooltip: 검정 상자 + 아래로 향한 화살표).
// 버튼 오른쪽 위에 절대 위치로 걸치는 요소라 터치를 가로채지 않는다(pointerEvents none).
// 시안의 83×38 / 패딩 7·12는 기본 스케일에 없어 가까운 값(py-2, px-3, right-1)으로 근사했다.
export function LastLoginTooltip() {
  const { t } = useTranslation();
  const themeColors = useThemeColors();

  return (
    <View pointerEvents="none" className="absolute -top-5 right-1 items-center">
      <View className="rounded-lg bg-background-dark px-3 py-2">
        <Text className="text-caption-main text-text-onImage">{t("최근 로그인")}</Text>
      </View>
      {/* 16×8 아래쪽 삼각형 — RN에는 clip-path가 없어 테두리 트릭으로 그린다 */}
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: 8,
          borderRightWidth: 8,
          borderTopWidth: 8,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderTopColor: themeColors.background.dark,
        }}
      />
    </View>
  );
}
