import { Pressable, Text, View } from "react-native";

import { Icon } from "../../../shared/components/base/Icon";
import { colors } from "../../../shared/theme/tokens";

interface MemberPickRowProps {
  name: string;
  /** 이미 속한 팀 이름. 없으면 "소속 팀 없음"이 넘어온다. */
  affiliation: string;
  selected: boolean;
  onPress: () => void;
}

// 팀원 추가 화면의 한 줄. 팀원 목록(MemberRow)과 달리 역할 대신 선택 표시가 오고
// 이름 아래에 이미 속한 팀이 붙는다 — 구성이 달라 따로 둔다.
export function MemberPickRow({ name, affiliation, selected, onPress }: MemberPickRowProps) {
  return (
    <Pressable
      className="flex-row items-center justify-between border-b border-text-assistive py-2.5"
      onPress={onPress}
    >
      <View className="flex-row items-center gap-4">
        <View className="h-10 w-10 rounded-full bg-text-assistive" />
        <View>
          <Text className="text-body-main text-text-normal">{name}</Text>
          <Text className="text-body-small text-text-alternative">{affiliation}</Text>
        </View>
      </View>
      {selected ? (
        <View className="h-6 w-6 items-center justify-center rounded-full bg-primary-normal">
          <Icon name="check" size={14} color={colors.text.disable} />
        </View>
      ) : (
        <View className="h-6 w-6 rounded-full border border-text-assistive" />
      )}
    </Pressable>
  );
}
