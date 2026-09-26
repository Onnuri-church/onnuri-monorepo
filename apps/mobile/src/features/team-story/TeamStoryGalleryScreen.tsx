import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useLayoutEffect, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { useAddTeamPhoto, useRemoveTeamPhotos, useTeam, useTeamGallery } from "./api";
import { canManageTeamGallery } from "./teamPermissions";
import { useMe } from "../profile/useMe";
import { GallerySelectionBar } from "./components/GallerySelectionBar";
import { PhotoGrid } from "./components/PhotoGrid";
import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { Header } from "../../shared/components/base/Header";
import type { RootStackParamList } from "../../shared/types/navigation";

// 사진 추가·삭제는 그 팀 팀장과 관리자만 — 권한이 없으면 헤더의 편집 버튼 자체가 안 뜬다.
export function TeamStoryGalleryScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, "TeamStoryGallery">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const deleteDialogRef = useRef<AppDialogRef>(null);
  const team = useTeam(params.teamId);
  const { data: gallery } = useTeamGallery(params.teamId);
  const me = useMe();
  const canManage = canManageTeamGallery(params.teamId, me);
  const addPhoto = useAddTeamPhoto(params.teamId);
  const removePhotos = useRemoveTeamPhotos(params.teamId);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const groups = gallery ?? [];
  const total = groups.reduce((count, group) => count + group.photos.length, 0);
  // 편집 삭제는 직접 업로드 사진만 — 게시글 사진은 글 삭제로만 빠진다 (서버도 거른다).
  const deletableIds = new Set(
    groups.flatMap((group) => group.photos.filter((p) => p.deletable).map((p) => p.id)),
  );

  const handleEditPress = () => {
    setSelecting((prev) => !prev);
    setSelectedIds([]);
  };

  // 선택 모드에서는 같은 탭이 뷰어 진입 대신 선택 토글이 된다.
  const handlePhotoPress = (photoId: string) => {
    if (!selecting) {
      navigation.navigate("TeamStoryPhotoViewer", { teamId: params.teamId, photoId });
      return;
    }
    // 게시글 사진은 여기서 못 지우므로 선택도 막는다.
    if (!deletableIds.has(photoId)) return;
    setSelectedIds((prev) =>
      prev.includes(photoId) ? prev.filter((id) => id !== photoId) : [...prev, photoId],
    );
  };

  // 시스템 포토 피커라 별도 권한 요청이 필요 없다 (셀 갤러리와 동일).
  const handleAddPress = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled) return;
    addPhoto.mutate(result.assets[0].uri);
  };

  const handleDeleteConfirm = () => {
    removePhotos.mutate(selectedIds);
    setSelectedIds([]);
    deleteDialogRef.current?.close();
  };

  // 우측 버튼 문구가 선택 모드에 따라 바뀌므로 화면이 헤더를 단독 등록한다 (QtBoardDetail 패턴).
  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <Header
          variant="sub"
          title={`${team?.name ?? "팀"} 갤러리`}
          rightAction={canManage ? "text" : "none"}
          rightLabel={selecting ? "완료" : "편집"}
          onPressRightLabel={handleEditPress}
        />
      ),
    });
  }, [navigation, params.teamId, selecting, canManage, team?.name]);

  return (
    <View className="flex-1 bg-background-normal">
      <ScrollView contentContainerClassName="px-5 pb-6">
        {/* 헤더 바로 아래 가운데 정렬 (시안 확정값) */}
        <Text className="text-center text-caption-main text-text-alternative">전체 {total}장</Text>
        <View className="mt-10 gap-9">
          {groups.map((group, index) => (
            <PhotoGrid
              key={group.month}
              label={group.month}
              photos={group.photos}
              onPhotoPress={handlePhotoPress}
              selecting={selecting}
              selectedIds={selectedIds}
              // 추가 칸은 시안대로 맨 위 묶음에만, 선택 모드가 아닐 때만 붙는다.
              onAddPress={canManage && !selecting && index === 0 ? handleAddPress : undefined}
            />
          ))}
          {/* 사진이 한 장도 없으면 묶음이 없어 추가 슬롯도 사라진다 — 첫 사진용 슬롯만 그린다
              (셀 갤러리와 같은 처리). */}
          {groups.length === 0 && canManage && !selecting && (
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
