import { Text, View } from "react-native";

import { Icon } from "../../../shared/components/base/Icon";

type IconName = React.ComponentProps<typeof Icon>["name"];

interface TeamProfileProps {
  name: string;
  description: string;
  icon?: IconName;
}

// 팀 상세 맨 위의 팀 소개 줄. 팀에 이름·소개·아이콘이 있다는 걸 아는 도메인 컴포넌트라
// feature에 둔다 (DESIGN.md 컴포넌트 배치 규칙).
// 시안 확정값: 아이콘 원 72, 안쪽 아이콘 24, 상자 padding 16, 아이콘-텍스트 16, 이름-소개 6.
export function TeamProfile({ name, description, icon }: TeamProfileProps) {
  return (
    <View className="flex-row items-center gap-4 p-4">
      <View className="h-18 w-18 items-center justify-center rounded-full bg-text-assistive">
        {/* 목록(icon.strong)과 달리 상세는 연한 색이다 — Icon 기본값이 icon.normal이라 그대로 둔다. */}
        {icon && <Icon name={icon} size={24} />}
      </View>
      <View className="flex-1 gap-1.5">
        <Text className="text-title text-text-normal">{name}</Text>
        <Text className="text-body-small text-text-neutral">{description}</Text>
      </View>
    </View>
  );
}
