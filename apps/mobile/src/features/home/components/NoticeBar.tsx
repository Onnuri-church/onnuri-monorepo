import { Pressable, Text, View } from "react-native";

import { Icon } from "../../../shared/components/base/Icon";

interface NoticeBarProps {
  /** 가장 최근 공지 제목 */
  title: string;
  /** 확성기를 눌렀을 때 — 공지 목록으로 */
  onListPress: () => void;
  /** 제목을 눌렀을 때 — 그 공지 상세로 */
  onTitlePress: () => void;
}

// 홈 맨 위 공지 한 줄. 왼쪽 확성기는 공지 목록, 제목은 그 공지의 상세로 이동한다.
// 공지가 없으면 호출부가 아예 그리지 않는다.
export function NoticeBar({ title, onListPress, onTitlePress }: NoticeBarProps) {
  return (
    <View className="h-11 flex-row items-center rounded-xl bg-background-alternative px-3">
      <Pressable className="pr-3 active:opacity-60" onPress={onListPress} hitSlop={8}>
        <Icon name="announcement" size={22} />
      </Pressable>
      <Pressable className="flex-1 active:opacity-60" onPress={onTitlePress}>
        <Text className="text-body-main text-text-normal" numberOfLines={1}>
          {title}
        </Text>
      </Pressable>
    </View>
  );
}
