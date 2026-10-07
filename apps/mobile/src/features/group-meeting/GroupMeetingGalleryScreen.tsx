import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useLayoutEffect, useRef, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  fetchGroupMeetingDetail,
  useAddGroupMeetingPhotos,
  useRemoveGroupMeetingPhotos,
} from "./api";
import { GallerySelectionBar } from "../team-story/components/GallerySelectionBar";
import { PhotoGrid } from "../team-story/components/PhotoGrid";
import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { Header } from "../../shared/components/base/Header";
import { uploadImage } from "../../shared/api/upload";
import type { RootStackParamList } from "../../shared/types/navigation";

// 소그룹 갤러리 (상세의 "사진 N장 모두 보기") — 팀 갤러리와 같은 월 묶음 그리드.
// 추가는 승인된 참여자·소그룹장·관리자(서버 규칙 동일), 편집(일괄 삭제)은 소그룹장·관리자만.
export function GroupMeetingGalleryScreen() {
  const insets = useSafeAreaInsets();
  const { params } = useRoute<RouteProp<RootStackParamList, "GroupMeetingGallery">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const deleteDialogRef = useRef<AppDialogRef>(null);

  // 상세를 거쳐 들어오므로 캐시가 있어 바로 그려진다 (상세와 같은 키).
  const { data: meeting } = useQuery({
    queryKey: ["group-meetings", params.meetingId],
    queryFn: () => fetchGroupMeetingDetail(params.meetingId),
  });
  const addPhotos = useAddGroupMeetingPhotos(params.meetingId);
  const removePhotos = useRemoveGroupMeetingPhotos(params.meetingId);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const photos = meeting?.photos ?? [];
  const canEdit = meeting?.canManage === true;
  const canAdd = canEdit || meeting?.myStatus === "APPROVED";

  // 서버가 최신순으로 주므로 월 라벨이 바뀔 때마다 새 묶음을 연다 (팀 갤러리와 같은 모양).
  // 촬영일이 없는 옛 사진은 라벨 없이 맨 뒤 묶음으로 모은다.
  const groups: { label: string; photos: { id: string; url: string }[] }[] = [];
  for (const photo of photos) {
    const label = photo.monthLabel ?? "";
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.photos.push(photo);
    else groups.push({ label, photos: [photo] });
  }

  const handleEditPress = () => {
    setSelecting((prev) => !prev);
    setSelectedIds([]);
  };

  // 선택 모드에서는 같은 탭이 뷰어 진입 대신 선택 토글이 된다 (팀 갤러리와 동일).
  const handlePhotoPress = (photoId: string) => {
    if (!selecting) {
      const index = photos.findIndex((photo) => photo.id === photoId);
      navigation.navigate("GroupMeetingPhoto", {
        meetingId: params.meetingId,
        index: Math.max(index, 0),
      });
      return;
    }
    setSelectedIds((prev) =>
      prev.includes(photoId) ? prev.filter((id) => id !== photoId) : [...prev, photoId],
    );
  };

  // 시스템 포토 피커라 별도 권한 요청이 필요 없다. 파일은 URL로 바꿔서 보낸다 (상세의 +추가와 동일).
  const handleAddPress = async () => {
    if (uploading) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled) return;
    setUploading(true);
    try {
      const imageUrls = await Promise.all(result.assets.map((asset) => uploadImage(asset.uri)));
      addPhotos.mutate(imageUrls, {
        onError: () => Alert.alert("사진을 등록하지 못했어요", "잠시 후 다시 시도해주세요."),
      });
    } catch {
      Alert.alert("사진 업로드 실패", "잠시 후 다시 시도해주세요.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteConfirm = () => {
    removePhotos.mutate(selectedIds, {
      onError: () => Alert.alert("삭제하지 못했어요", "잠시 후 다시 시도해주세요."),
    });
    setSelectedIds([]);
    setSelecting(false);
    deleteDialogRef.current?.close();
  };

  // 우측 버튼 문구가 선택 모드에 따라 바뀌므로 화면이 헤더를 단독 등록한다 (팀 갤러리 패턴).
  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <Header
          variant="sub"
          title={meeting?.title ?? "취향 소그룹"}
          rightAction={canEdit ? "text" : "none"}
          rightLabel={selecting ? "완료" : "편집"}
          onPressRightLabel={handleEditPress}
        />
      ),
    });
  }, [navigation, selecting, canEdit, meeting?.title]);

  return (
    <View className="flex-1 bg-background-normal">
      <ScrollView
        contentContainerClassName="px-5"
        contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
      >
        {/* 헤더 바로 아래 가운데 정렬 (팀 갤러리와 같은 시안 값) */}
        {/* 업로드는 수 초 걸린다 — 장수 자리에 진행 중임을 알린다. */}
        <Text className="text-center text-caption-main text-text-alternative">
          {uploading ? "사진 올리는 중..." : `전체 ${photos.length}장`}
        </Text>
        <View className="mt-10 gap-9">
          {groups.map((group, index) => (
            <PhotoGrid
              key={`${group.label}-${index}`}
              label={group.label}
              showLabel={group.label !== ""}
              photos={group.photos}
              onPhotoPress={handlePhotoPress}
              selecting={selecting}
              selectedIds={selectedIds}
              // 추가 칸은 시안대로 맨 위 묶음에만, 선택 모드가 아닐 때만 붙는다.
              onAddPress={canAdd && !selecting && index === 0 ? handleAddPress : undefined}
            />
          ))}
          {/* 사진이 한 장도 없으면 묶음이 없어 추가 슬롯도 사라진다 — 첫 사진용 슬롯만 그린다. */}
          {groups.length === 0 && canAdd && !selecting && (
            <PhotoGrid label="" photos={[]} showLabel={false} onAddPress={handleAddPress} />
          )}
        </View>
      </ScrollView>

      {selecting && (
        <View className="px-5">
          <GallerySelectionBar
            selectedCount={selectedIds.length}
            onDeletePress={() => {
              if (selectedIds.length > 0) deleteDialogRef.current?.open();
            }}
          />
        </View>
      )}

      <AppDialog
        ref={deleteDialogRef}
        title="정말 삭제하시겠습니까?"
        description="삭제된 데이터는 복구할 수 없습니다."
        confirmLabel="확인"
        cancelLabel="취소"
        placement="center"
        onConfirm={handleDeleteConfirm}
      />
    </View>
  );
}
