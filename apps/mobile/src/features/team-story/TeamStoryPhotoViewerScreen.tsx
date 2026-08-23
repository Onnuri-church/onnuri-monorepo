import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { allPhotos, findPhotoIndex, findTeam } from "./teams";
import { Icon } from "../../shared/components/base/Icon";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";

// 사진 한 장을 꽉 채워 보는 화면. 헤더를 Header 컴포넌트로 그리지 않고 여기서 직접 그린다 —
// 시안이 배경 없는 어두운 헤더에 타이틀까지 요구하는데 sub(흰 배경)·overlay(타이틀 없음) 어느 쪽도 맞지 않고,
// 이 모양을 쓰는 화면이 아직 여기뿐이다. 다른 뷰어가 같은 헤더를 쓰게 되면 그때 공용으로 올린다.
export function TeamStoryPhotoViewerScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, "TeamStoryPhotoViewer">>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const photos = allPhotos();
  const [index, setIndex] = useState(() => Math.max(findPhotoIndex(params.photoId), 0));
  const photo = photos[index];

  const handlePrevPress = () => setIndex((current) => Math.max(current - 1, 0));
  const handleNextPress = () => setIndex((current) => Math.min(current + 1, photos.length - 1));

  return (
    <View className="flex-1 bg-background-dark" style={{ paddingTop: insets.top }}>
      {/* 헤더 — 배경 없이 사진 위에 얹힌다. 뒤로가기 아이콘 색은 시안 값(icon.strong) 그대로다. */}
      <View className="h-14 flex-row items-center justify-between px-5">
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Icon name="back" size={28} color={colors.icon.strong} />
        </Pressable>
        <Text className="text-heading-main text-text-disable">
          {findTeam(params.teamId)?.name ?? "팀"} 사진
        </Text>
        {/* 자리를 남겨야 타이틀이 가운데 온다 */}
        <View className="w-7" />
      </View>

      <Text className="text-center text-caption-main text-text-alternative">
        {index + 1}/{photos.length}
      </Text>

      <View className="mt-4 flex-1 justify-center">
        {photo?.url ? (
          <Image source={{ uri: photo.url }} className="h-full w-full" resizeMode="contain" />
        ) : (
          <View className="h-full w-full bg-text-assistive" />
        )}
        <Pressable
          className="absolute left-5 top-1/2"
          onPress={handlePrevPress}
          disabled={index === 0}
          hitSlop={8}
        >
          <Icon name="expand" size={28} />
        </Pressable>
        <Pressable
          className="absolute right-5 top-1/2"
          onPress={handleNextPress}
          disabled={index === photos.length - 1}
          hitSlop={8}
        >
          <Icon name="expand-right" size={28} />
        </Pressable>
      </View>

      <View className="gap-px px-5 pb-10 pt-5" style={{ paddingBottom: insets.bottom + 40 }}>
        <Text className="text-heading-small text-text-disable">{photo?.title}</Text>
        <Text className="text-body-small text-text-disable">{photo?.meta}</Text>
      </View>
    </View>
  );
}
