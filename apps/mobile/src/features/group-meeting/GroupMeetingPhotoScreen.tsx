import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { Icon } from "../../shared/components/base/Icon";
import { useThemeColors } from "../../shared/theme/useThemeColors";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { fetchGroupMeetingDetail, useRemoveGroupMeetingPhoto } from "./api";

// 소그룹 활동 사진 뷰어 (셀 갤러리 뷰어와 같은 검정 배경 + "N/전체" + 좌우 이동).
// 좌우 스와이프로 넘기고, 화살표는 제스처를 모르는 사용자용 힌트로 남긴다 (2026-10-02 결정).
// 소그룹장·관리자는 우상단 삭제로 현재 사진을 지운다 — 등록부는 headerShown: false.
export function GroupMeetingPhotoScreen() {
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const route = useRoute<RouteProp<RootStackParamList, "GroupMeetingPhoto">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { meetingId, index: initialIndex } = route.params;

  // 상세를 거쳐 들어오므로 캐시에 있다 — 같은 순서(최신순)로 그린다.
  const { data: meeting } = useQuery({
    queryKey: ["group-meetings", meetingId],
    queryFn: () => fetchGroupMeetingDetail(meetingId),
  });
  const photos = meeting?.photos ?? [];
  const totalCount = photos.length;

  const [index, setIndex] = useState(initialIndex);
  const removePhoto = useRemoveGroupMeetingPhoto(meetingId);
  const dialogRef = useRef<AppDialogRef>(null);
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<(typeof photos)[number]>>(null);

  // 화살표·삭제 모두 이 함수로 이동한다. index는 여기서 즉시 갱신한다 —
  // Android는 프로그램 스크롤이 momentum end를 안 쏘기도 해서 이벤트만 믿으면
  // 카운터·삭제 대상이 어긋난다. 제스처 스크롤은 handleScrollEnd가 최종값으로 덮는다.
  const goTo = (next: number, animated = true) => {
    listRef.current?.scrollToIndex({ index: next, animated });
    setIndex(next);
  };

  // 캐시가 비어 있던 채 열리면 FlatList가 빈 배열로 마운트돼 initialScrollIndex가
  // 무효다 — 사진이 처음 도착한 시점에 한 번만 원하는 장으로 맞춘다.
  const appliedInitialIndex = useRef(false);
  useEffect(() => {
    if (appliedInitialIndex.current || totalCount === 0) return;
    appliedInitialIndex.current = true;
    if (initialIndex > 0) {
      const next = Math.min(initialIndex, totalCount - 1);
      requestAnimationFrame(() => goTo(next, false));
    }
    // goTo는 렌더마다 새로 만들어지지만 동작이 같아 의존성에서 뺀다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCount, initialIndex]);

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  const handleDeleteConfirm = () => {
    dialogRef.current?.close();
    const photo = photos[index];
    if (!photo || removePhoto.isPending) return;
    removePhoto.mutate(photo.id, {
      onSuccess: (detail) => {
        // 마지막 장을 지웠으면 앞 장으로, 다 지웠으면 상세로 돌아간다.
        if (detail.photos.length === 0) {
          navigation.goBack();
          return;
        }
        // 목록이 줄어든 다음 프레임에 스크롤을 맞춘다 — 같은 프레임이면 옛 길이 기준으로 튄다.
        const next = Math.min(index, detail.photos.length - 1);
        requestAnimationFrame(() => goTo(next, false));
      },
      onError: () => Alert.alert(t("삭제 실패"), t("잠시 후 다시 시도해주세요.")),
    });
  };

  return (
    <View className="flex-1 bg-background-dark" style={{ paddingTop: insets.top }}>
      <View className="h-8 flex-row items-center justify-center">
        <Pressable
          className="absolute left-5 h-8 w-8 items-center justify-center"
          onPress={() => navigation.goBack()}
        >
          <Icon name="back" size={28} color={themeColors.text.onImage} />
        </Pressable>
        <Text className="text-heading-small text-text-onImage">
          {meeting?.title ?? t("활동 사진")}
        </Text>
        {meeting?.canManage && (
          <Pressable
            className="absolute right-5"
            onPress={() => dialogRef.current?.open()}
            hitSlop={8}
          >
            <Text className="text-body-small text-semantic-danger">{t("삭제")}</Text>
          </Pressable>
        )}
      </View>
      <Text className="mt-2 text-center text-caption-main text-text-alternative">
        {totalCount === 0 ? "0/0" : `${index + 1}/${totalCount}`}
      </Text>

      <View className="flex-1 justify-center">
        <FlatList
          ref={listRef}
          data={photos}
          keyExtractor={(photo) => photo.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={Math.min(initialIndex, Math.max(totalCount - 1, 0))}
          getItemLayout={(_, itemIndex) => ({
            length: width,
            offset: width * itemIndex,
            index: itemIndex,
          })}
          onMomentumScrollEnd={handleScrollEnd}
          renderItem={({ item }) => (
            <View className="justify-center" style={{ width }}>
              <Image
                source={{ uri: item.url }}
                className="w-full"
                style={{ aspectRatio: 402 / 617 }}
                resizeMode="contain"
              />
            </View>
          )}
        />

        <Pressable
          className="absolute left-5 h-7 w-7 items-center justify-center"
          disabled={index === 0}
          onPress={() => goTo(index - 1)}
        >
          <Icon name="expand" size={28} color={colors.icon.normal} />
        </Pressable>
        <Pressable
          className="absolute right-5 h-7 w-7 items-center justify-center"
          disabled={index >= totalCount - 1}
          onPress={() => goTo(index + 1)}
        >
          <Icon name="expand-right" size={28} color={colors.icon.normal} />
        </Pressable>
      </View>

      <AppDialog
        ref={dialogRef}
        title={t("이 사진을 삭제하시겠습니까?")}
        description={t("삭제된 사진은 복구할 수 없습니다.")}
        confirmLabel={t("삭제")}
        cancelLabel={t("취소")}
        onConfirm={handleDeleteConfirm}
      />
    </View>
  );
}
