import { Pressable, Text, View } from "react-native";

import { Icon } from "../../../shared/components/base/Icon";

interface TeamBoardLinkProps {
  title: string;
  description: string;
  onPress?: () => void;
  /** 제목 옆에 빨간 점을 붙인다 (안 읽은 단톡 메시지가 있을 때) */
  badge?: boolean;
}

// 팀 상세 맨 아래의 팀 게시판 바로가기 줄. 왼쪽 초록 바로 구간을 표시하고 오른쪽에 화살표가 온다.
// 시안 확정값: 바 3x35, 바-텍스트 간격 12, 제목-설명 간격 1, 화살표 24.
// 바 크기(3x35)는 기본 스케일에 없어서 가장 가까운 4x36으로 뒀다 — 확정값 확인 후 조정한다.
export function TeamBoardLink({ title, description, onPress, badge }: TeamBoardLinkProps) {
  return (
    <Pressable className="flex-row items-center justify-between gap-4" onPress={onPress}>
      <View className="flex-1 flex-row items-center gap-3">
        <View className="h-9 w-1 bg-primary-normal" />
        <View className="flex-1 gap-px">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-body-main text-text-normal">{title}</Text>
            {badge && <View className="h-2 w-2 rounded-full bg-semantic-danger" />}
          </View>
          <Text className="text-body-small text-text-neutral">{description}</Text>
        </View>
      </View>
      <Icon name="expand-right" size={24} />
    </Pressable>
  );
}
