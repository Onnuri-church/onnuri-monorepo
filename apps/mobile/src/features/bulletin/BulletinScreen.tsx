import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { ScrollView, View } from "react-native";

import type { RootStackParamList } from "../../shared/types/navigation";
import { FilterBar } from "../../shared/components/base/FilterBar";
import { FloatingButton } from "../../shared/components/base/FloatingButton";
import { Icon } from "../../shared/components/base/Icon";
import { colors } from "../../shared/theme/tokens";
import { BulletinCard } from "./components/BulletinCard";
import { SermonSeriesBanner } from "./components/SermonSeriesBanner";

// API 연동 전 임시 데이터. 이번 달 시리즈 엔드포인트가 생기면 교체한다.
const SERMON_SERIES = {
  seriesLabel: "8월 설교 시리즈",
  title: "하나님 나라의 왕",
  description: "마태복음 5:1 - 7:29 · 산상수훈을 따라가는 8월",
};

// 월 목록도 임시. 주보 엔드포인트가 생기면 실제 데이터에서 뽑는다.
// value는 아래 주보 date의 앞부분과 맞춰야 필터가 걸린다 (큐티나눔과 같은 방식).
const MONTHS = [
  { value: "2026.06", label: "26년 6월" },
  { value: "2026.05", label: "26년 5월" },
  { value: "2026.04", label: "26년 4월" },
  { value: "2026.03", label: "26년 3월" },
  { value: "2026.02", label: "26년 2월" },
];

// API 연동 전 임시 데이터.
// date는 요일까지 붙은 완성형 문자열이다 — 표시용 문구는 API가 계산해 내려주기로 되어 있어서
// (packages/shared의 statusLabel·timeAgo와 같은 규칙) 화면에서 요일을 계산하지 않는다.
const BulletinInfo = [
    {
        id: "1",
        date: "2026.06.01 (일)",
        title: "심령이 가난한 자의 복",
        img: "https://i.namu.wiki/i/3T-vwDpi1dUnhvtTMcm_qeHDJkysOCHZNCeyILaMa4GJWdSC-E1bqU9wMUWVarFBIN9VSBx6TkDqvVmbHXP9EQ.webp",
    },
    {
        id: "2",
        date: "2026.06.08 (일)",
        title: "심령이 가난한 자의 복",
        img: "https://i.namu.wiki/i/3T-vwDpi1dUnhvtTMcm_qeHDJkysOCHZNCeyILaMa4GJWdSC-E1bqU9wMUWVarFBIN9VSBx6TkDqvVmbHXP9EQ.webp",
    },
]


export function BulletinScreen() {
  const [month, setMonth] = useState(MONTHS[0].value);
  const visibleBulletins = BulletinInfo.filter((bulletin) => bulletin.date.startsWith(month));
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleWritePress = () => navigation.navigate("BulletinWrite");

  return (
    <View className="flex-1 bg-background-normal">
      <FilterBar items={MONTHS} selected={month} onSelect={setMonth} />
      {/* 시안의 필터-배너 간격 36 중 16은 FilterBar가 자기 padding으로 갖고 있어서 20만 더한다. */}
      <ScrollView contentContainerClassName="px-5 pb-6 pt-5">
        {/* 시안의 배너-목록 간격 40 중 24는 BulletinCard가 자기 py로 갖고 있어서 16만 더한다. */}
        <View className="mb-4">
          <SermonSeriesBanner
            seriesLabel={SERMON_SERIES.seriesLabel}
            title={SERMON_SERIES.title}
            description={SERMON_SERIES.description}
          />
        </View>
        {visibleBulletins.map((bulletin) => (
          <BulletinCard
            key={bulletin.id}
            date={bulletin.date}
            title={bulletin.title}
            onBulletinPress={() => navigation.navigate("BulletinDetail", { id: bulletin.id })}
            onSharePress={() => navigation.navigate("SharingSheet", { id: bulletin.id })}
          />
        ))}
      </ScrollView>
      <FloatingButton onPress={handleWritePress}>
        <Icon name="plus" color={colors.icon.disable} />
      </FloatingButton>
    </View>
  );
}
