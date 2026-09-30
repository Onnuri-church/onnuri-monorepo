import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Alert, Image, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { Icon } from "../../shared/components/base/Icon";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { fetchGroupMeetingDetail, useRemoveGroupMeetingPhoto } from "./api";

// 소그룹 활동 사진 뷰어 (셀 갤러리 뷰어와 같은 검정 배경 + "N/전체" + 좌우 이동).
// 소그룹장·관리자는 우상단 삭제로 현재 사진을 지운다 — 등록부는 headerShown: false.
export function GroupMeetingPhotoScreen() {
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
        setIndex((prev) => Math.min(prev, detail.photos.length - 1));
      },
      onError: () => Alert.alert("삭제 실패", "잠시 후 다시 시도해주세요."),
    });
  };

  return (
    <View className="flex-1 bg-background-dark" style={{ paddingTop: insets.top }}>
      <View className="h-8 flex-row items-center justify-center">
        <Pressable
          className="absolute left-5 h-8 w-8 items-center justify-center"
          onPress={() => navigation.goBack()}
        >
          <Icon name="back" size={28} color={colors.icon.disable} />
        </Pressable>
        <Text className="text-heading-small text-text-disable">
          {meeting?.title ?? "활동 사진"}
        </Text>
        {meeting?.canManage && (
          <Pressable
            className="absolute right-5"
            onPress={() => dialogRef.current?.open()}
            hitSlop={8}
          >
            <Text className="text-body-small text-semantic-danger">삭제</Text>
          </Pressable>
        )}
      </View>
      <Text className="mt-2 text-center text-caption-main text-text-alternative">
        {totalCount === 0 ? "0/0" : `${index + 1}/${totalCount}`}
      </Text>

      <View className="flex-1 justify-center">
        {photos[index] ? (
          <Image
            source={{ uri: photos[index].url }}
            className="w-full"
            style={{ aspectRatio: 402 / 617 }}
            resizeMode="contain"
          />
        ) : (
          <View className="w-full bg-background-assistive" style={{ aspectRatio: 402 / 617 }} />
        )}

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

      <AppDialog
        ref={dialogRef}
        title="이 사진을 삭제하시겠습니까?"
        description="삭제된 사진은 복구할 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={handleDeleteConfirm}
      />
    </View>
  );
}
