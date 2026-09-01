import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { FilterBar } from "../../shared/components/base/FilterBar";
import { FloatingButton } from "../../shared/components/base/FloatingButton";
import { Icon } from "../../shared/components/base/Icon";
import { SearchBar } from "../../shared/components/base/SearchBar";
import { Skeleton } from "../../shared/components/base/Skeleton";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import {
  MOCK_MY_ROLE,
  PRAYER_CATEGORIES,
  deletePrayer,
  fetchPrayers,
  fetchPrayersForAdmin,
  type PrayerCategory,
} from "./api";
import { useToggleBookmark } from "./useToggleBookmark";
import { PrayerCard, type PrayerRequest } from "./components/PrayerCard";
import { PrayerMenu } from "./components/PrayerMenu";

// 시안 확정값(402pt 프레임): 콘텐츠 폭 362 = 402 - 20*2.
const CONTENT_PADDING = 20;

export function PrayerBoardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const toggleBookmark = useToggleBookmark();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<PrayerCategory>("all");
  const [keyword, setKeyword] = useState("");
  // 삭제 확인 중인 기도제목 (관리자용). 다이얼로그는 하나만 두고 대상만 바꾼다 — PrayerFilterList와 같다.
  const [pendingDelete, setPendingDelete] = useState<PrayerRequest | null>(null);
  const dialogRef = useRef<AppDialogRef>(null);

  // 관리자용 게시판(시안: 기도제목 게시판-관리자용)은 별도 화면이 아니라 같은 게시판의 role 분기다.
  // 등록 개수 문구 대신 경고 문구, 북마크·글쓰기 FAB 없음, 카드마다 삭제 줄이 항상 붙는다.
  const isAdmin = MOCK_MY_ROLE === "admin";

  const { data, isPending, isError } = useQuery({
    queryKey: ["prayers", category, isAdmin],
    queryFn: () => (isAdmin ? fetchPrayersForAdmin(category) : fetchPrayers(category)),
  });

  const handleDeletePress = (prayer: PrayerRequest) => {
    setPendingDelete(prayer);
    dialogRef.current?.open();
  };

  const handleDeleteConfirm = async () => {
    if (pendingDelete) await deletePrayer(pendingDelete.id);
    dialogRef.current?.close();
    setPendingDelete(null);
    // 카테고리별로 캐시가 나뉘어 있어 지운 글이 다른 탭에 남지 않도록 기도제목 쿼리를 전부 새로 받는다.
    await queryClient.invalidateQueries({ queryKey: ["prayers"] });
  };

  return (
    <View className="flex-1 bg-background-normal">
      <FilterBar items={[...PRAYER_CATEGORIES]} selected={category} onSelect={setCategory} />

      <ScrollView contentContainerClassName="pb-6" style={{ paddingHorizontal: CONTENT_PADDING }}>
        {isAdmin ? (
          // 시안: Body/Small 13px, Semantic/Warning, 자물쇠 12·간격 3(기본 스케일에 없어 4로 넣었다).
          <View className="mt-2 flex-row items-center justify-center gap-1">
            <Icon name="lock" size={12} color={colors.semantic.warning} />
            <Text className="text-body-small text-semantic-warning">
              관리자만 실제 작성자를 확인할 수 있어요
            </Text>
          </View>
        ) : (
          // 시안: Title/Main 22px Bold, 행간 26(2줄 = 52). 등록 개수만 브랜드 색으로 강조한다.
          // 공용 TEXT_STYLE은 행간이 140%라 여기서만 시안 값을 지정한다 (PrayerCard와 같은 이유).
          <Text className="mt-2 text-center text-title text-text-normal" style={{ lineHeight: 26 }}>
            현재 <Text className="text-primary-normal">{data?.totalCount ?? 0}개</Text>의 기도제목이
            {"\n"}등록되어 있어요
          </Text>
        )}

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
            <PrayerCard
              key={prayer.id}
              prayer={prayer}
              showBookmark={!isAdmin}
              editing={isAdmin}
              deleteOnly
              onPress={() => navigation.navigate("PrayerBoardDetail", { id: prayer.id })}
              onToggleBookmark={() => toggleBookmark(prayer.id)}
              onDelete={() => handleDeletePress(prayer)}
            />
          ))}
        </View>
      </ScrollView>

      {!isAdmin && (
        <FloatingButton onPress={() => navigation.navigate("PrayerWrite")}>
          <Icon name="write" size={24} color={colors.icon.disable} />
        </FloatingButton>
      )}

      <PrayerMenu title="기도제목 게시판" />

      <AppDialog
        ref={dialogRef}
        title="정말 삭제하시겠습니까?"
        description="삭제된 데이터는 복구할 수 없습니다."
        confirmLabel="확인"
        cancelLabel="취소"
        onConfirm={handleDeleteConfirm}
      />
    </View>
  );
}
