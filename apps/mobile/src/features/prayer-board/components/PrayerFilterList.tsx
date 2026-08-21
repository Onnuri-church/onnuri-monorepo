import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { AppSheet, type AppSheetRef } from "../../../shared/components/base/AppSheet";
import { FilterBar } from "../../../shared/components/base/FilterBar";
import { Skeleton } from "../../../shared/components/base/Skeleton";
import type { RootStackParamList } from "../../../shared/types/navigation";
import { PRAYER_CATEGORIES, deletePrayer, type PrayerCategory } from "../api";
import { useToggleBookmark } from "../useToggleBookmark";
import { PrayerCard, type PrayerRequest } from "./PrayerCard";

interface PrayerFilterListProps {
  /** react-query 캐시 구분용 이름 (예: "bookmarked") */
  name: string;
  fetchList: (category: PrayerCategory) => Promise<PrayerRequest[]>;
  /** 카드 우상단 북마크 표시 여부. 내 기도제목 화면은 시안에 북마크가 없다. */
  showBookmark?: boolean;
  /** 수정 모드. 카드마다 수정/삭제 줄이 붙는다. */
  editing?: boolean;
  emptyText: string;
}

// 시안 확정값(402pt 프레임): 콘텐츠 폭 362 = 402 - 20*2, 카드 사이 24.
const CONTENT_PADDING = 20;

// 카테고리 필터 + 기도제목 목록. 저장한/내 기도제목 화면이 목록 출처와 북마크 표시만 다르고
// 나머지가 같아서 여기로 묶는다. 게시판(PrayerBoardScreen)은 검색·등록 개수 문구가 더 붙어 별개다.
export function PrayerFilterList({
  name,
  fetchList,
  showBookmark,
  editing,
  emptyText,
}: PrayerFilterListProps) {
  const [category, setCategory] = useState<PrayerCategory>("all");
  // 삭제 확인 중인 기도제목. 시트는 하나만 두고 대상만 바꾼다.
  const [pendingDelete, setPendingDelete] = useState<PrayerRequest | null>(null);
  const sheetRef = useRef<AppSheetRef>(null);
  const queryClient = useQueryClient();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const toggleBookmark = useToggleBookmark();

  const { data, isPending, isError } = useQuery({
    queryKey: ["prayers", name, category],
    queryFn: () => fetchList(category),
  });

  const askDelete = (prayer: PrayerRequest) => {
    setPendingDelete(prayer);
    sheetRef.current?.open();
  };

  const confirmDelete = async () => {
    if (pendingDelete) await deletePrayer(pendingDelete.id);
    sheetRef.current?.close();
    setPendingDelete(null);
    // 카테고리별로 캐시가 나뉘어 있어 지운 글이 다른 탭에 남지 않도록 기도제목 쿼리를 전부 새로 받는다.
    await queryClient.invalidateQueries({ queryKey: ["prayers"] });
  };

  return (
    <View className="flex-1 bg-background-normal">
      <FilterBar items={[...PRAYER_CATEGORIES]} selected={category} onSelect={setCategory} />

      <ScrollView
        contentContainerClassName="gap-6 pb-6 pt-2.5"
        style={{ paddingHorizontal: CONTENT_PADDING }}
      >
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

        {data?.length === 0 && (
          <Text className="mt-6 text-center text-body-medium text-text-alternative">
            {emptyText}
          </Text>
        )}

        {data?.map((prayer) => (
          <PrayerCard
            key={prayer.id}
            prayer={prayer}
            showBookmark={showBookmark}
            editing={editing}
            onPress={() => navigation.navigate("PrayerBoardDetail", { id: prayer.id })}
            onToggleBookmark={() => toggleBookmark(prayer.id)}
            onDelete={() => askDelete(prayer)}
          />
        ))}
      </ScrollView>

      {/* 삭제는 되돌릴 수 없어서 한 번 더 묻는다. 취소는 SelectField와 같은 자리(시트 바닥)에 둔다. */}
      <AppSheet
        ref={sheetRef}
        footer={
          <View className="bg-background-normal px-4 pb-4">
            <View className="border-t-2 border-background-assistive" />
            <Pressable
              onPress={() => sheetRef.current?.close()}
              className="pt-4 active:opacity-60"
              hitSlop={8}
            >
              <Text className="text-center text-body-medium text-text-alternative">취소</Text>
            </Pressable>
          </View>
        }
      >
        <View className="px-4 pb-6 pt-2">
          <Text className="text-center text-body-main text-text-normal">
            이 기도제목을 삭제할까요?
          </Text>
          <Text className="mt-2 text-center text-body-small text-text-alternative">
            삭제하면 되돌릴 수 없어요
          </Text>
          <Pressable
            onPress={confirmDelete}
            className="mt-6 h-12 items-center justify-center rounded-xl bg-semantic-danger active:opacity-80"
          >
            <Text className="text-body-main text-background-normal">삭제</Text>
          </Pressable>
        </View>
      </AppSheet>
    </View>
  );
}
