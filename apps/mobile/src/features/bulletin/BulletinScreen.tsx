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
import { YearMonthPicker } from "../../shared/components/composed/YearMonthPicker";
import { colors } from "../../shared/theme/tokens";
import { useMe } from "../profile/useMe";
import { fetchBulletins } from "./api";
import { BulletinCard } from "./components/BulletinCard";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function BulletinScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  // 처음에는 달을 고르지 않고 보낸다 — 주보가 있는 가장 최근 달을 서버가 골라 준다.
  const [month, setMonth] = useState<string>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // 등록은 관리자와 주보 업로드 권한이 켜진 팀의 팀원만 된다 (서버 ContentManagerGuard와 같은 규칙)
  // — 못 쓰는 사람에게 버튼을 보이면 403을 만난다.
  const canUpload = useMe()?.canUploadBulletin === true;

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
          <YearMonthPicker months={months} selected={selectedMonth} onSelect={setMonth} />
        </View>
      )}
      <ScrollView contentContainerClassName="px-5 pt-5"
        // 바닥 여백에 안전영역을 더한다 — 안드로이드 내비 바에 마지막 항목이 가리지 않게.
        contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}>
        {items.map((bulletin) => (
          <BulletinCard
            key={bulletin.id}
            date={bulletin.dateLabel}
            title={bulletin.title}
            hasHandout={bulletin.hasHandout}
            onBulletinPress={() => navigation.navigate("BulletinDetail", { id: bulletin.id })}
            onSharePress={() => navigation.navigate("SharingSheet", { id: bulletin.id })}
          />
        ))}
      </ScrollView>
      {canUpload && (
        <FloatingButton onPress={handleWritePress}>
          <Icon name="plus" color={colors.icon.disable} />
        </FloatingButton>
      )}
    </View>
  );
}
