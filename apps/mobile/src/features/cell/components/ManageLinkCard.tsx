import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "../../../shared/components/base/Icon";
import { colors } from "../../../shared/theme/tokens";

interface ManageLinkCardProps {
  title: string;
  description: string;
  onPress?: () => void;
}

// 관리 탭의 이동 카드 (시안: 높이 73.6, 패딩 13/16, 0.3px 테두리, radius 20).
export function ManageLinkCard({ title, description, onPress }: ManageLinkCardProps) {
  return (
    <Pressable
      className="flex-row items-center rounded-5 px-4 py-3"
      style={{
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.icon.normal,
      }}
      onPress={onPress}
    >
      <View className="flex-1 gap-1">
        <Text className="text-heading-small text-text-normal">{title}</Text>
        <Text className="text-body-medium text-text-alternative">{description}</Text>
      </View>
      <Icon name="expand-right" size={28} />
    </Pressable>
  );
}
