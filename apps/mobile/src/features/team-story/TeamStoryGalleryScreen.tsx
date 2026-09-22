import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useLayoutEffect, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { useTeam, useTeamGallery } from "./api";
import { GallerySelectionBar } from "./components/GallerySelectionBar";
import { PhotoGrid } from "./components/PhotoGrid";
import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { Header } from "../../shared/components/base/Header";
import type { RootStackParamList } from "../../shared/types/navigation";

// 목업이 팀별로 나뉘어 있지 않아 teamId로 조회하지는 않는다. 사진 API가 생기면 그때 쓴다.
export function TeamStoryGalleryScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, "TeamStoryGallery">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const deleteDialogRef = useRef<AppDialogRef>(null);
  const team = useTeam(params.teamId);
  const { data: gallery } = useTeamGallery(params.teamId);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const groups = gallery ?? [];
  const total = groups.reduce((count, group) => count + group.photos.length, 0);

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
    setSelectedIds((prev) =>
      prev.includes(photoId) ? prev.filter((id) => id !== photoId) : [...prev, photoId],
    );
  };

  // TODO(SCRUM-128): 사진 추가 연동. 업로드(POST /uploads) → 갤러리 등록까지 붙인다.
  const handleAddPress = () => {};

  const handleDeleteConfirm = () => {
    // TODO(SCRUM-128): 사진 삭제 연동 (DELETE /teams/:id/gallery).
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
          rightAction="text"
          rightLabel={selecting ? "완료" : "편집"}
          onPressRightLabel={handleEditPress}
        />
      ),
    });
  }, [navigation, params.teamId, selecting]);

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
              onAddPress={!selecting && index === 0 ? handleAddPress : undefined}
            />
          ))}
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
