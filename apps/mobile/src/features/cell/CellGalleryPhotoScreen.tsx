import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "../../shared/components/base/Icon";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { getCellDetail } from "./cellDetail";
import { findCell } from "./cells";

// 갤러리 사진 뷰어 (시안: 검정 배경 + "N/전체" 카운터 + 좌우 화살표).
// 배경이 어두워 공통 sub 헤더를 못 쓰고 화면이 직접 그린다 — 등록부는 headerShown: false.
export function CellGalleryPhotoScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "CellGalleryPhoto">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { cellId, index: initialIndex } = route.params;

  const cell = findCell(cellId);
  const totalCount = getCellDetail(cellId).gallery.reduce(
    (sum, section) => sum + section.photoIds.length,
    0,
  );

  const [index, setIndex] = useState(initialIndex);

  return (
    <View className="flex-1 bg-background-dark" style={{ paddingTop: insets.top }}>
      {/* 헤더 행: 뒤로가기 + 셀 이름(흰색), 아래에 카운터 */}
      <View className="h-8 flex-row items-center justify-center">
        <Pressable
          className="absolute left-5 h-8 w-8 items-center justify-center"
          onPress={() => navigation.goBack()}
        >
          <Icon name="back" size={28} color={colors.icon.disable} />
        </Pressable>
        <Text className="text-heading-small text-text-disable">{cell?.name ?? "갤러리"}</Text>
      </View>
      <Text className="mt-2 text-center text-caption-main text-text-alternative">
        {index + 1}/{totalCount}
      </Text>

      <View className="flex-1 justify-center">
        {/* TODO(사진): 이미지 연동 전 placeholder — 실제 이미지가 붙으면 원본 비율을 따른다.
            시안 402x617은 콘텐츠 비율 영역이라 aspectRatio로 처리한다 (DESIGN.md 사이즈 규칙 예외). */}
        <View className="w-full bg-background-assistive" style={{ aspectRatio: 402 / 617 }} />

        <Pressable
          className="absolute left-5 h-7 w-7 items-center justify-center"
          disabled={index === 0}
          onPress={() => setIndex((prev) => prev - 1)}
        >
          <Icon name="expand" size={28} color={colors.icon.normal} />
        </Pressable>
        <Pressable
          className="absolute right-5 h-7 w-7 items-center justify-center"
          disabled={index >= totalCount - 1}
          onPress={() => setIndex((prev) => prev + 1)}
        >
          <Icon name="expand-right" size={28} color={colors.icon.normal} />
        </Pressable>
      </View>
    </View>
  );
}
