import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";

import { useAuthStore } from "../../shared/store/useAuthStore";

import { fetchQtShares } from "./api";
import { PickerPill } from "./components/PickerPill";
import { QtPostCard } from "./components/QtPostCard";
import { useToggleQtLike } from "./useToggleQtLike";
import { FilterChip } from "../../shared/components/base/FilterChip";
import { FloatingButton } from "../../shared/components/base/FloatingButton";
import { Icon } from "../../shared/components/base/Icon";
import { Skeleton } from "../../shared/components/base/Skeleton";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";

// 월 선택지는 항상 1~12 전부다 — 글 없는 달은 빈 화면으로 보여준다 (서버가 골라 줄 필요 없음).
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: `${index + 1}월`,
}));

export function QtBoardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "QtBoard">>();

  // 전체 | 내 글 — 마이페이지의 큐티나눔 통계에서 들어오면 처음부터 "내 글"이다.
  const [mine, setMine] = useState(route.params?.mine === true);
  // 연·월은 처음에 정하지 않고 보낸다 — 글이 있는 가장 최근 달을 서버가 골라 주고,
  // 그 값을 응답(selectedYear/Month)으로 받아 버튼에 표시한다.
  const [pick, setPick] = useState<{ year: number; month: number }>();

  const { data, isPending, isError } = useQuery({
    queryKey: ["qt-shares", mine, pick?.year, pick?.month],
    queryFn: () => fetchQtShares({ mine, year: pick?.year, month: pick?.month }),
    // 필터를 바꾸는 동안 이전 응답을 유지한다 — 안 그러면 필터 줄까지 스켈레톤으로 사라진다.
    placeholderData: keepPreviousData,
  });

  // 범위를 바꾸면 연·월 선택을 비운다 — 전체에서 보던 달에 내 글이 없어 빈 화면부터 보게
  // 되는 걸 막고, 서버가 그 범위의 최근 달을 다시 골라 준다.
  const handleScopePress = (nextMine: boolean) => {
    if (nextMine === mine) return;
    if (nextMine && useAuthStore.getState().session.status !== "authenticated") {
      Alert.alert("로그인이 필요해요", "내 글은 로그인 후 볼 수 있어요.");
      return;
    }
    setMine(nextMine);
    setPick(undefined);
  };

  const toggleLike = useToggleQtLike();

  const handleCardPress = (id: string) => {
    navigation.navigate("QtBoardDetail", { id });
  };

  const handleFavoritePress = (id: string, likedByMe: boolean) => {
    toggleLike({ postId: id, likedByMe });
  };

  const handleWritePress = () => {
    // 게스트는 작성까지 다 한 뒤 등록 실패를 만나게 된다 — 들어가기 전에 안내한다.
    const { session } = useAuthStore.getState();
    if (session.status !== "authenticated") {
      Alert.alert("로그인이 필요해요", "글쓰기는 로그인 후 할 수 있어요.");
      return;
    }
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

  const { years, selectedYear, selectedMonth, items } = data;

  return (
    <View className="flex-1 bg-background-normal">
      {/* 요청값이 아니라 서버가 고른 연·월을 표시한다 — 연·월을 정하지 않고 보냈을 때
          서버가 고른 달이 곧 목록이 보여주는 달이다. */}
      <View className="flex-row items-center justify-between px-5 pb-1 pt-4">
        <View className="flex-row items-center gap-2">
          <PickerPill
            label={`${selectedYear}년`}
            options={years.map((year) => ({ value: year, label: `${year}년` }))}
            selected={selectedYear}
            onSelect={(year) => setPick({ year, month: selectedMonth })}
          />
          <PickerPill
            label={`${selectedMonth}월`}
            options={MONTH_OPTIONS}
            selected={selectedMonth}
            onSelect={(month) => setPick({ year: selectedYear, month })}
          />
        </View>
        <View className="flex-row items-center gap-2">
          <FilterChip label="전체" selected={!mine} onPress={() => handleScopePress(false)} />
          <FilterChip label="내 글" selected={mine} onPress={() => handleScopePress(true)} />
        </View>
      </View>
      <ScrollView contentContainerClassName="gap-4 pt-3 px-5 py-4">
        {items.length === 0 && (
          <Text className="mt-16 text-center text-body-medium text-text-alternative">
            {mine ? "이 달에 작성한 큐티가 없어요" : "이 달에는 작성된 큐티가 없어요"}
          </Text>
        )}
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
              favorited: item.likedByMe,
            }}
            onPress={() => handleCardPress(item.id)}
            onFavoritePress={() => handleFavoritePress(item.id, item.likedByMe)}
          />
        ))}
      </ScrollView>
      <FloatingButton onPress={handleWritePress}>
        <Icon name="write" color={colors.icon.disable} />
      </FloatingButton>
    </View>
  );
}
