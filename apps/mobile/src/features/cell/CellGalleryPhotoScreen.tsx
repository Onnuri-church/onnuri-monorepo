import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "../../shared/components/base/Icon";
import { useThemeColors } from "../../shared/theme/useThemeColors";
import { PhotoPager } from "../../shared/components/composed/PhotoPager";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useCell, useCellGallery } from "./api";

// 갤러리 사진 뷰어 (시안: 검정 배경 + "N/전체" 카운터). 좌우로 밀어서 넘긴다 (화살표는 보조).
// 배경이 어두워 공통 sub 헤더를 못 쓰고 화면이 직접 그린다 — 등록부는 headerShown: false.
export function CellGalleryPhotoScreen() {
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const route = useRoute<RouteProp<RootStackParamList, "CellGalleryPhoto">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { cellId, index: initialIndex } = route.params;

  const cell = useCell(cellId);
  // 갤러리 탭을 거쳐 들어오므로 캐시에 있다 — 탭의 평탄화 인덱스와 같은 순서로 편다.
  const { data: galleryData } = useCellGallery(cellId);
  const photos = (galleryData ?? []).flatMap((section) => section.photos);
  const totalCount = photos.length;

  const [index, setIndex] = useState(initialIndex);

  return (
    <View className="flex-1 bg-background-dark" style={{ paddingTop: insets.top }}>
      {/* 헤더 행: 뒤로가기 + 셀 이름(흰색), 아래에 카운터 */}
      <View className="h-8 flex-row items-center justify-center">
        <Pressable
          className="absolute left-5 h-8 w-8 items-center justify-center"
          onPress={() => navigation.goBack()}
        >
          <Icon name="back" size={28} color={themeColors.text.onImage} />
        </Pressable>
        <Text className="text-heading-small text-text-onImage">{cell?.name ?? t("갤러리")}</Text>
      </View>
      <Text className="mt-2 text-center text-caption-main text-text-alternative">
        {index + 1}/{totalCount}
      </Text>

      <PhotoPager urls={photos.map((photo) => photo.url)} initialIndex={initialIndex} onIndexChange={setIndex} />
    </View>
  );
}
