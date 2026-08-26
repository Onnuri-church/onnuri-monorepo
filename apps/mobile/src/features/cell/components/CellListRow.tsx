import { Pressable, Text, View } from "react-native";

import { Icon } from "../../../shared/components/base/Icon";
import type { Cell } from "../cells";

interface CellListRowProps {
  cell: Cell;
  /** 내가 속한 셀이면 "나의 셀" 뱃지를 단다. */
  isMyCell: boolean;
  onPress?: () => void;
}

// 전체 셀 목록의 한 행 (시안 Member/Detail/Row: 높이 60 = 아바타 40 + 상하 10, 아래 1px 구분선).
export function CellListRow({ cell, isMyCell, onPress }: CellListRowProps) {
  const leaderLine = cell.viceLeaderName
    ? `셀장 ${cell.leaderName} / 부셀장 ${cell.viceLeaderName}`
    : `셀장 ${cell.leaderName}`;

  return (
    <Pressable
      className="flex-row items-center border-b border-background-assistive py-2.5"
      onPress={onPress}
    >
      {/* TODO(사진): 셀 대표 사진 연동 전 placeholder */}
      <View className="h-10 w-10 rounded-full bg-background-assistive" />
      {/* 이름-셀장 정보 간격은 시안 5px인데 스케일에 없어 4px(gap-1)로 근사 */}
      <View className="ml-2.5 flex-1 flex-row items-center gap-1">
        <Text className="text-body-main text-text-normal">{cell.name}</Text>
        <Text className="text-body-small text-text-alternative" numberOfLines={1}>
          {leaderLine}
        </Text>
      </View>
      {isMyCell && (
        <View className="rounded-2xl bg-background-alternative px-2.5 py-1">
          <Text className="text-caption-main text-primary-normal">나의 셀</Text>
        </View>
      )}
      <Icon name="expand-right" size={28} />
    </Pressable>
  );
}
