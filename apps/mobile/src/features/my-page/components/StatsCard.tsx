import { Fragment } from "react";
import { Pressable, Text, View } from "react-native";

interface Stat {
  label: string;
  value: number;
  /** 주면 이 항목이 눌린다 (예: 큐티나눔 → 내 글 목록) */
  onPress?: () => void;
}

interface StatsCardProps {
  stats: Stat[];
}

// 활동 통계 카드 (큐티나눔·출석주수·받은하트). 항목 사이에 세로 구분선이 들어간다.
// 시안은 그룹 간격 64px에 구분선(높이 34)이 그 사이 중앙에 떠 있다 — 34px은 스케일에 없어
// h-8(32px)로 근사. 항목은 카드를 3등분(flex-1)해서 번역으로 라벨이 길어져도 카드 밖으로 안 나가고,
// 그래도 넘치면 한 줄로 줄여 맞춘다.
export function StatsCard({ stats }: StatsCardProps) {
  return (
    <View className="flex-row items-center justify-center rounded-5 bg-background-normal px-4 py-5 shadow-card">
      {stats.map((stat, index) => (
        <Fragment key={stat.label}>
          {index > 0 && <View className="h-8 w-px bg-background-assistive" />}
          <Pressable
            className="min-w-0 flex-1 items-center gap-1 px-1"
            disabled={!stat.onPress}
            onPress={stat.onPress}
            hitSlop={8}
            style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
          >
            <Text className="text-heading-small text-text-normal">{stat.value}</Text>
            <Text
              className="text-center text-body-small text-text-alternative"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {stat.label}
            </Text>
          </Pressable>
        </Fragment>
      ))}
    </View>
  );
}
