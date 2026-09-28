import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import type { RootStackParamList } from "../../shared/types/navigation";
import { FilterBar } from "../../shared/components/base/FilterBar";
import { FloatingButton } from "../../shared/components/base/FloatingButton";
import { Icon } from "../../shared/components/base/Icon";
import { Skeleton } from "../../shared/components/base/Skeleton";
import { colors } from "../../shared/theme/tokens";
import { useMe } from "../profile/useMe";
import { fetchBulletins } from "./api";
import { BulletinCard } from "./components/BulletinCard";
import { SermonSeriesBanner } from "./components/SermonSeriesBanner";

// API 연동 전 임시 데이터. 이번 달 시리즈 엔드포인트가 생기면 교체한다.
const SERMON_SERIES = {
  seriesLabel: "8월 설교 시리즈",
  title: "하나님 나라의 왕",
  description: "마태복음 5:1 - 7:29 · 산상수훈을 따라가는 8월",
};

export function BulletinScreen() {
  // 처음에는 달을 고르지 않고 보낸다 — 주보가 있는 가장 최근 달을 서버가 골라 준다.
  const [month, setMonth] = useState<string>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // 등록은 관리자만 된다 (서버 AdminGuard와 같은 규칙) — 못 쓰는 사람에게 버튼을 보이면 403을 만난다.
  const isAdmin = useMe()?.isAdmin === true;

  const { data, isPending, isError } = useQuery({
    queryKey: ["bulletins", month],
    queryFn: () => fetchBulletins(month),
    // 달을 바꾸는 동안 이전 응답을 유지한다 — 안 그러면 필터 줄까지 스켈레톤으로 사라진다.
    placeholderData: keepPreviousData,
  });

  const handleWritePress = () => navigation.navigate("BulletinWrite");

  if (isPending) {
    return (
      <View className="flex-1 bg-background-normal">
        <View className="gap-4 px-5 py-5">
          <Skeleton className="h-64 rounded-5" />
          <Skeleton className="h-12 rounded" />
          <Skeleton className="h-12 rounded" />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-background-normal">
        <Text className="text-body-medium text-text-alternative">주보를 불러오지 못했어요</Text>
      </View>
    );
  }

  const { months, selectedMonth, items } = data;

  return (
    <View className="flex-1 bg-background-normal">
      {/* 요청한 달(month)이 아니라 서버가 고른 달을 표시한다 — 요청한 달에 주보가 없으면
          서버가 최신 달로 폴백하는데, 요청값을 쓰면 목록과 어긋난다. */}
      <FilterBar items={months} selected={selectedMonth ?? ""} onSelect={setMonth} />
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
        {items.map((bulletin) => (
          <BulletinCard
            key={bulletin.id}
            date={bulletin.dateLabel}
            title={bulletin.title}
            onBulletinPress={() => navigation.navigate("BulletinDetail", { id: bulletin.id })}
            onSharePress={() => navigation.navigate("SharingSheet", { id: bulletin.id })}
          />
        ))}
      </ScrollView>
      {isAdmin && (
        <FloatingButton onPress={handleWritePress}>
          <Icon name="plus" color={colors.icon.disable} />
        </FloatingButton>
      )}
    </View>
  );
}
