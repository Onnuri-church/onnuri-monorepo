import { Text, View } from "react-native";

import { Icon } from "../../../shared/components/base/Icon";
import { colors } from "../../../shared/theme/tokens";

interface VideoStatusBadgesProps {
  isLive?: boolean;
  /** 표시용 시청자 수 (예: "10K"). 없으면 배지를 그리지 않는다. */
  viewCount?: string;
  className?: string;
}

// 영상 위에 겹치는 상태 배지. 목록 카드와 상세가 같은 모양을 써서 여기 모아둔다.
// 라이브 여부·시청자 수를 아는 도메인 컴포넌트라 features 안에 둔다.
export function VideoStatusBadges({ isLive, viewCount, className }: VideoStatusBadgesProps) {
  if (!isLive && !viewCount) return null;

  return (
    <View
      className={["flex-row items-center gap-2.5", className].filter(Boolean).join(" ")}
    >
      {isLive && (
        <View className="rounded bg-semantic-danger p-2">
          <Text className="text-caption-small text-text-disable">LIVE</Text>
        </View>
      )}
      {viewCount && (
        <View className="flex-row items-center gap-0.5 rounded bg-text-alternative p-2">
          <Icon name="view-light" size={12} color={colors.icon.disable} />
          <Text className="text-caption-small text-text-disable">{viewCount}</Text>
        </View>
      )}
    </View>
  );
}
