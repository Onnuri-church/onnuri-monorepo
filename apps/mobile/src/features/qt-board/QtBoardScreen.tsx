import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { fetchQtShares } from "./api";
import { QtPostCard } from "./components/QtPostCard";
import { FilterBar } from "../../shared/components/base/FilterBar";
import { FloatingButton } from "../../shared/components/base/FloatingButton";
import { Icon } from "../../shared/components/base/Icon";
import { Skeleton } from "../../shared/components/base/Skeleton";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";

export function QtBoardScreen() {
  // 처음에는 달을 고르지 않고 보낸다 — 글이 있는 가장 최근 달을 서버가 골라 준다.
  const [month, setMonth] = useState<string>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { data, isPending, isError } = useQuery({
    queryKey: ["qt-shares", month],
    queryFn: () => fetchQtShares(month),
    // 달을 바꾸는 동안 이전 응답을 유지한다 — 안 그러면 필터 줄까지 스켈레톤으로 사라진다.
    placeholderData: keepPreviousData,
  });

  const handleCardPress = (id: string) => {
    navigation.navigate("QtBoardDetail", { id });
  };

  const handleWritePress = () => {
    navigation.navigate("QtBoardWrite");
  };

  if (isPending) {
    return (
      <View className="flex-1 bg-background-normal">
        <View className="gap-4 px-5 py-4">
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl" />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-background-normal">
        <Text className="text-body-medium text-text-alternative">
          큐티나눔을 불러오지 못했어요
        </Text>
      </View>
    );
  }

  const { months, selectedMonth, items } = data;

  return (
    <View className="flex-1 bg-background-normal">
      {/* 요청한 달(month)이 아니라 서버가 고른 달을 표시한다 — 보고 있던 달의 글이 전부
          사라지면 서버가 최신 달로 폴백하는데, 요청값을 쓰면 목록과 어긋난다. */}
      <FilterBar items={months} selected={selectedMonth ?? ""} onSelect={setMonth} />
      <ScrollView contentContainerClassName="gap-4 pt-3 px-5 py-4">
        {items.map((item) => (
          <QtPostCard
            key={item.id}
            post={{
              id: item.id,
              author: item.authorName,
              date: item.dateLabel,
              title: item.title,
              description: item.description,
              favorite: item.likeCount,
            }}
            onPress={() => handleCardPress(item.id)}
          />
        ))}
      </ScrollView>
      <FloatingButton onPress={handleWritePress}>
        <Icon name="write" color={colors.icon.disable} />
      </FloatingButton>
    </View>
  );
}
