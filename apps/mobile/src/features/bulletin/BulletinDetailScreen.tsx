import { useRoute, type RouteProp } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { ImagePager } from "../../shared/components/base/ImagePager";
import type { RootStackParamList } from "../../shared/types/navigation";
import { fetchBulletin } from "./api";

// 주보 상세. 이미지만 넘겨서 보므로 화면은 데이터만 고르고 나머지는 ImagePager가 한다
// (나눔지 화면 SharingSheetScreen과 같은 구조다 — 같은 응답의 다른 이미지 묶음을 쓴다).
export function BulletinDetailScreen() {
  const { t } = useTranslation();
  const { params } = useRoute<RouteProp<RootStackParamList, "BulletinDetail">>();
  const { data, isPending, isError } = useQuery({
    queryKey: ["bulletin", params.id],
    queryFn: () => fetchBulletin(params.id),
  });

  if (isPending) return <View className="flex-1 bg-background-normal" />;

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-background-normal">
        <Text className="text-body-medium text-text-alternative">{t("주보를 불러오지 못했어요")}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-normal">
      <ImagePager className="mt-6" images={data.bulletinImages} />
    </View>
  );
}
