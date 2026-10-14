import { Text, View } from "react-native";

interface CategoryBadgeProps {
  label: string;
}

// 기도제목 카테고리 배지 (카드·상세가 같이 쓴다).
// base/Chip을 안 쓰는 이유: Chip은 글자가 12px이라 높이가 21이 되어 시안의 17을 넘기고,
// 카드 높이 106이 그만큼 밀린다. 공용 TEXT_STYLE의 행간(140%)도 시안 값(13)으로 덮는다.
const BADGE_LINE = 13;

export function CategoryBadge({ label }: CategoryBadgeProps) {
  return (
    <View className="self-start rounded-full bg-background-alternative px-2 py-0.5">
      <Text className="text-caption-small text-primary-normal" style={{ lineHeight: BADGE_LINE }}>
        {label}
      </Text>
    </View>
  );
}
