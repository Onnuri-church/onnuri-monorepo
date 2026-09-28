import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { FilterBar } from "../../shared/components/base/FilterBar";
import { Skeleton } from "../../shared/components/base/Skeleton";
import { useHideTabBarOnScroll } from "../../shared/hooks/useHideTabBarOnScroll";
import type { RootStackParamList } from "../../shared/types/navigation";
import { fetchSermons } from "./api";
import { SermonVideoCard } from "./components/SermonVideoCard";

// 말씀 게시판. 월 필터 아래로 설교영상 카드가 쌓인다.
export function SermonScreen() {
  // 처음에는 달을 고르지 않고 보낸다 — 영상이 있는 가장 최근 달을 서버가 골라 준다.
  const [month, setMonth] = useState<string>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // 하단 탭 화면이라 스크롤 내리면 탭바를 숨긴다 (셀·마이페이지와 동일).
  const handleHideTabBarScroll = useHideTabBarOnScroll();

  const { data, isPending, isError } = useQuery({
    queryKey: ["sermons", month],
    queryFn: () => fetchSermons(month),
    // 달을 바꾸는 동안 이전 응답을 유지한다 — 안 그러면 필터 줄까지 스켈레톤으로 사라진다.
    placeholderData: keepPreviousData,
  });

  if (isPending) {
    return (
      <View className="flex-1 bg-background-page">
        <View className="gap-7 px-5 py-5">
          <Skeleton className="h-64 rounded-5" />
          <Skeleton className="h-64 rounded-5" />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-background-page">
        <Text className="text-body-medium text-text-alternative">말씀을 불러오지 못했어요</Text>
      </View>
    );
  }

  const { months, selectedMonth, items } = data;

  return (
    <View className="flex-1 bg-background-page">
      {/* 요청한 달(month)이 아니라 서버가 고른 달을 표시한다 — 요청한 달에 영상이 없으면
          서버가 최신 달로 폴백하는데, 요청값을 쓰면 목록과 어긋난다. */}
      <FilterBar items={months} selected={selectedMonth ?? ""} onSelect={setMonth} />
      {/* 시안의 필터-목록 간격 36 중 16은 FilterBar가 자기 padding으로 갖고 있어서 20만 더한다. */}
      <ScrollView
        contentContainerClassName="gap-7 px-5 pb-6 pt-5"
        onScroll={handleHideTabBarScroll}
        scrollEventThrottle={16}
      >
        {items.map((video) => (
          <SermonVideoCard
            key={video.id}
            video={video}
            onPress={() => navigation.navigate("SermonDetail", { id: video.id })}
          />
        ))}
      </ScrollView>
    </View>
  );
}
