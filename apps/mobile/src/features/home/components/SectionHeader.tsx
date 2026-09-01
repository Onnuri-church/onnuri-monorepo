import { Pressable, Text, View } from "react-native";

import { Icon } from "../../../shared/components/base/Icon";

interface SectionHeaderProps {
  title: string;
  /** 주면 오른쪽에 화살표가 붙고 눌린다 (해당 게시판으로 이동). */
  onPress?: () => void;
}

// 홈 화면 섹션 제목 줄. 시안 확정값: 높이 28, 제목 Heading/Small, 오른쪽 화살표 28.
// 홈 밖에서 쓰는 곳이 아직 없어서 base가 아니라 홈 feature에 둔다 (DESIGN.md 컴포넌트 배치 규칙).
export function SectionHeader({ title, onPress }: SectionHeaderProps) {
  return (
    <View className="h-7 flex-row items-center justify-between">
      <Text className="text-heading-small text-text-normal">{title}</Text>
      {onPress && (
        <Pressable className="active:opacity-60" onPress={onPress} hitSlop={8}>
          <Icon name="expand-right" size={28} />
        </Pressable>
      )}
    </View>
  );
}
