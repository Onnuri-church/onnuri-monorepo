import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { FilterBar } from "../../shared/components/base/FilterBar";
import { FloatingButton } from "../../shared/components/base/FloatingButton";
import { Icon } from "../../shared/components/base/Icon";
import { SearchBar } from "../../shared/components/base/SearchBar";
import { Skeleton } from "../../shared/components/base/Skeleton";
import { PrayerCard } from "./components/PrayerCard";
import { colors } from "../../shared/theme/tokens";
import { PRAYER_CATEGORIES, fetchPrayers, type PrayerCategory } from "./api";

// 시안 확정값(402pt 프레임): 콘텐츠 폭 362 = 402 - 20*2.
const CONTENT_PADDING = 20;

export function PrayerBoardScreen() {
  const [category, setCategory] = useState<PrayerCategory>("all");
  const [keyword, setKeyword] = useState("");

  const { data, isPending, isError } = useQuery({
    queryKey: ["prayers", category],
    queryFn: () => fetchPrayers(category),
  });

  return (
    <View className="flex-1 bg-background-normal">
      <FilterBar items={[...PRAYER_CATEGORIES]} selected={category} onSelect={setCategory} />

      <ScrollView contentContainerClassName="pb-6" style={{ paddingHorizontal: CONTENT_PADDING }}>
        {/* 시안: Title/Main 22px Bold, 행간 26(2줄 = 52). 등록 개수만 브랜드 색으로 강조한다.
            공용 TEXT_STYLE은 행간이 140%라 여기서만 시안 값을 지정한다 (PrayerCard와 같은 이유). */}
        <Text className="mt-2 text-center text-title text-text-normal" style={{ lineHeight: 26 }}>
          현재 <Text className="text-primary-normal">{data?.totalCount ?? 0}개</Text>의 기도제목이
          {"\n"}등록되어 있어요
        </Text>

        <View className="mt-6">
          <SearchBar value={keyword} onChangeText={setKeyword} placeholder="기도제목 검색" />
        </View>

        <View className="mt-6 gap-6">
          {isPending && (
            <>
              <Skeleton className="h-24 w-full rounded-5" />
              <Skeleton className="h-24 w-full rounded-5" />
            </>
          )}

          {isError && (
            <Text className="text-center text-body-medium text-text-alternative">
              기도제목을 불러오지 못했어요
            </Text>
          )}

          {data?.items.map((prayer) => (
            <PrayerCard key={prayer.id} prayer={prayer} />
          ))}
        </View>
      </ScrollView>

      <FloatingButton onPress={() => undefined}>
        <Icon name="write" size={24} color={colors.icon.disable} />
      </FloatingButton>
    </View>
  );
}
