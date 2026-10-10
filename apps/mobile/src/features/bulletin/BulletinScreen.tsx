import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";

import type { RootStackParamList } from "../../shared/types/navigation";
import { FloatingButton } from "../../shared/components/base/FloatingButton";
import { Icon } from "../../shared/components/base/Icon";
import { Skeleton } from "../../shared/components/base/Skeleton";
import { PickerPill } from "../../shared/components/composed/PickerPill";
import { colors } from "../../shared/theme/tokens";
import { useHomeBanner } from "../home/api";
import { useMe } from "../profile/useMe";
import { fetchBulletins } from "./api";
import { BulletinCard } from "./components/BulletinCard";
import { SermonSeriesBanner } from "./components/SermonSeriesBanner";

export function BulletinScreen() {
  const { t } = useTranslation();
  // 처음에는 달을 고르지 않고 보낸다 — 주보가 있는 가장 최근 달을 서버가 골라 준다.
  const [month, setMonth] = useState<string>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // 등록은 관리자만 된다 (서버 AdminGuard와 같은 규칙) — 못 쓰는 사람에게 버튼을 보이면 403을 만난다.
  const isAdmin = useMe()?.isAdmin === true;

  // 상단 시리즈 배너 = 홈 배너와 같은 데이터 (관리자가 홈 배너 관리에서 등록한 최신 1건).
  // 구절이 없는 옛 포스터 배너이거나 등록된 게 없으면 배너 없이 목록만 그린다.
  const { data: banner } = useHomeBanner();
  const sermonBanner = banner?.passage ? banner : null;

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
        <Text className="text-body-medium text-text-alternative">{t("주보를 불러오지 못했어요")}</Text>
      </View>
    );
  }

  const { months, selectedMonth, items } = data;

  return (
    <View className="flex-1 bg-background-normal">
      {/* 요청한 달(month)이 아니라 서버가 고른 달을 표시한다 — 요청한 달에 주보가 없으면
          서버가 최신 달로 폴백하는데, 요청값을 쓰면 목록과 어긋난다. */}
      {/* 달이 많아져도 옆으로 늘어서지 않게 말씀 게시판처럼 토글(드롭다운)로 둔다 —
          펼치면 5개까지 보이고 안에서 위아래로 스크롤한다. */}
      {selectedMonth !== null && (
        <View className="flex-row px-5 pb-1 pt-4">
          <PickerPill
            label={months.find((item) => item.value === selectedMonth)?.label ?? selectedMonth}
            options={months}
            selected={selectedMonth}
            onSelect={setMonth}
          />
        </View>
      )}
      <ScrollView contentContainerClassName="px-5 pb-6 pt-5">
        {/* 시안의 배너-목록 간격 40 중 24는 BulletinCard가 자기 py로 갖고 있어서 16만 더한다. */}
        {sermonBanner && (
          <View className="mb-4">
            <SermonSeriesBanner
              seriesLabel={sermonBanner.seriesLabel ?? ""}
              title={sermonBanner.title}
              description={sermonBanner.passage ?? ""}
              imageUrl={sermonBanner.imageUrl ?? undefined}
            />
          </View>
        )}
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
