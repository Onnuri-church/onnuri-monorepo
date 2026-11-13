import { Pressable, Text, View } from "react-native";

import { Icon } from "../../../shared/components/base/Icon";
import { PressableScale } from "../../../shared/components/base/PressableScale";
import { colors } from "../../../shared/theme/tokens";

type IconName = React.ComponentProps<typeof Icon>["name"];

interface TeamListItemProps {
  name: string;
  description: string;
  /** 팀 아이콘. 디자인 export 전까지는 비워두고 회색 원만 그린다. */
  icon?: IconName;
  onPress?: () => void;
  /**
   * 관리자 편집 모드에서만 넘긴다. 주면 오른쪽 화살표 자리에 수정·삭제 아이콘이 나온다.
   * 둘 다 없으면 평범한 행이다 (팀스토리 목록).
   */
  onEditPress?: () => void;
  onDeletePress?: () => void;
}

// 팀 목록의 한 줄. 회색 원 안에 팀 아이콘, 오른쪽에 팀명과 한 줄 소개가 온다.
// 셀 목록(CellListRow)과 같은 크기로 맞췄다 (SCRUM-202): 높이 60 = 원 40 + 상하 10, 이름 옆에
// 소개 한 줄(길면 말줄임), 연한 구분선. 예전 시안(높이 81, 원 48, 소개는 아래 줄)보다 한 화면에 더 보인다.
export function TeamListItem({
  name,
  description,
  icon,
  onPress,
  onEditPress,
  onDeletePress,
}: TeamListItemProps) {
  const row = (
    <PressableScale
      scaleTo={0.98}
      className="flex-row items-center border-b border-background-assistive bg-background-normal py-2.5"
      onPress={onPress}
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-text-assistive">
        {icon && <Icon name={icon} size={20} color={colors.icon.strong} />}
      </View>
      <View className="ml-2.5 flex-1 flex-row items-center gap-1">
        <Text className="text-body-main text-text-normal">{name}</Text>
        <Text className="flex-1 text-body-small text-text-alternative" numberOfLines={1}>
          {description}
        </Text>
      </View>
      {onEditPress || onDeletePress ? (
        <View className="flex-row items-center gap-5">
          {onEditPress && (
            <Pressable onPress={onEditPress} hitSlop={8}>
              <Icon name="edit" size={20} />
            </Pressable>
          )}
          {onDeletePress && (
            <Pressable onPress={onDeletePress} hitSlop={8}>
              <Icon name="trash-can" size={20} color={colors.semantic.danger} />
            </Pressable>
          )}
        </View>
      ) : (
        <Icon name="expand-right" size={28} />
      )}
    </PressableScale>
  );

  return row;
}
