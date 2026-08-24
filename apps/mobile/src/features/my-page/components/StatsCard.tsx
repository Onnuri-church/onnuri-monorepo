import { Fragment } from "react";
import { Text, View } from "react-native";

interface Stat {
  label: string;
  value: number;
}

interface StatsCardProps {
  stats: Stat[];
}

// 활동 통계 카드 (큐티나눔·출석주수·받은하트). 항목 사이에 세로 구분선이 들어간다.
// 시안은 그룹 간격 64px에 구분선(높이 34)이 그 사이 중앙에 떠 있다 — 구분선을 flex 자식으로
// 두는 대신 간격을 반으로 나눠(gap-8) 근사한다. 34px도 스케일에 없어 h-8(32px)로 근사.
export function StatsCard({ stats }: StatsCardProps) {
  return (
    <View className="flex-row items-center justify-center gap-8 rounded-5 bg-background-normal px-4 py-5 shadow-card">
      {stats.map((stat, index) => (
        <Fragment key={stat.label}>
          {index > 0 && <View className="h-8 w-px bg-background-assistive" />}
          <View className="items-center gap-1">
            <Text className="text-heading-small text-text-normal">{stat.value}</Text>
            <Text className="text-body-small text-text-alternative">{stat.label}</Text>
          </View>
        </Fragment>
      ))}
    </View>
  );
}
