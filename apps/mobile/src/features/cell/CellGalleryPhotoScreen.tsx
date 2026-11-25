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
    <View className="flex-1 bg-background-dark">
      {/* 사진은 화면 전체를 쓰고 헤더는 그 위에 얹는다 (SCRUM-306) — 헤더 아래 남은 영역에 넣으면
          사진이 화면 가운데가 아니라 헤더 높이의 절반만큼 아래로 내려가 보인다 (채팅 사진 뷰어와 같은 방식). */}
      <PhotoPager
        urls={photos.map((photo) => photo.url)}
        initialIndex={initialIndex}
        onIndexChange={setIndex}
      />
      {/* 헤더 행: 뒤로가기 + 셀 이름(흰색), 아래에 카운터. 사진을 미는 손짓은 헤더 빈 곳을 통과한다. */}
      <View
        pointerEvents="box-none"
        className="absolute left-0 right-0 top-0"
        style={{ paddingTop: insets.top }}
      >
        <View pointerEvents="box-none" className="h-8 flex-row items-center justify-center">
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
      </View>
    </View>
  );
}
