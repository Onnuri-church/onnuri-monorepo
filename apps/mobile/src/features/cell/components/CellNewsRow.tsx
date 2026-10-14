import type { CellNewsListItem } from "@onnuri/shared";
import { Pressable, StyleSheet, Text } from "react-native";

import { useThemeColors } from "../../../shared/theme/useThemeColors";
import { toTimeAgo } from "../../../shared/utils/date";

interface CellNewsRowProps {
  news: CellNewsListItem;
  onPress?: () => void;
}

// 소식 탭 목록의 한 행 (시안: 높이 74 = 상하 16 + 제목 23 + 간격 3 + 작성일 16, 아래 0.3px 구분선).
export function CellNewsRow({ news, onPress }: CellNewsRowProps) {
  const themeColors = useThemeColors();
  return (
    <Pressable
      className="gap-1 py-4"
      style={{
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: themeColors.background.assistive,
      }}
      onPress={onPress}
    >
      <Text className="text-body-main text-text-normal" numberOfLines={1}>
        {news.title}
      </Text>
      <Text className="text-caption-main text-text-alternative">
        {news.dateLabel} · {toTimeAgo(news.createdAt)}
      </Text>
    </Pressable>
  );
}
