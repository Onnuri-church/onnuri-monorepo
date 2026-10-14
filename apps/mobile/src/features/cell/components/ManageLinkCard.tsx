import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "../../../shared/components/base/Icon";
import { useThemeColors } from "../../../shared/theme/useThemeColors";

interface ManageLinkCardProps {
  title: string;
  description: string;
  onPress?: () => void;
  /** 화살표 왼쪽에 붙이는 표시 (안 읽은 개수 뱃지 등) */
  right?: ReactNode;
}

// 관리 탭의 이동 카드 (시안: 높이 73.6, 패딩 13/16, 0.3px 테두리, radius 20).
export function ManageLinkCard({ title, description, onPress, right }: ManageLinkCardProps) {
  const themeColors = useThemeColors();
  return (
    <Pressable
      className="flex-row items-center rounded-5 px-4 py-3"
      style={{
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: themeColors.icon.normal,
      }}
      onPress={onPress}
    >
      <View className="flex-1 gap-1">
        <Text className="text-heading-small text-text-normal">{title}</Text>
        <Text className="text-body-medium text-text-alternative">{description}</Text>
      </View>
      {right && <View className="mr-1">{right}</View>}
      <Icon name="expand-right" size={28} />
    </Pressable>
  );
}
