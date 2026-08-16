import { Pressable, Text, View } from "react-native";

import { Icon } from "../../../shared/components/base/Icon";
import { colors } from "../../../shared/theme/tokens";

type IconName = React.ComponentProps<typeof Icon>["name"];

interface TeamListItemProps {
  name: string;
  description: string;
  /** 팀 아이콘. 디자인 export 전까지는 비워두고 회색 원만 그린다. */
  icon?: IconName;
  onPress?: () => void;
}

// 팀 목록의 한 줄. 회색 원 안에 팀 아이콘, 오른쪽에 팀명과 한 줄 소개가 온다.
// 시안 확정값: 행 높이 81(py-4 + 내용 49), 아이콘 원 48, 우측 화살표 28.
// 팀명-소개 사이 간격은 시안이 5px인데 스케일에 없어서 4px(gap-1)로 뒀다 — 디자인 확인 대기.
export function TeamListItem({ name, description, icon, onPress }: TeamListItemProps) {
  return (
    <Pressable
      className="flex-row items-center gap-4 border-b border-text-assistive py-4"
      onPress={onPress}
    >
      <View className="h-12 w-12 items-center justify-center rounded-full bg-text-assistive">
        {icon && <Icon name={icon} size={24} color={colors.icon.strong} />}
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-heading-small text-text-normal">{name}</Text>
        <Text className="text-body-small text-text-neutral">{description}</Text>
      </View>
      <Icon name="expand-right" size={28} />
    </Pressable>
  );
}
