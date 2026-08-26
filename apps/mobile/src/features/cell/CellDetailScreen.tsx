import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { FloatingButton } from "../../shared/components/base/FloatingButton";
import { Icon } from "../../shared/components/base/Icon";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { canManageCell, canPostToCell, getCellDetail } from "./cellDetail";
import type { CellMember, GalleryMonth } from "./cellDetail";
import { CellMemberItem } from "./components/CellMemberItem";
import { CellNewsRow } from "./components/CellNewsRow";
import { CellTabBar, type CellTabKey } from "./components/CellTabBar";
import { GalleryMonthGrid, type GalleryTile } from "./components/GalleryMonthGrid";
import { ManageLinkCard } from "./components/ManageLinkCard";

const MEMBER_COLUMNS = 3;

interface GalleryMonthState {
  month: string;
  tiles: GalleryTile[];
}

// 사진 API 전이라 갤러리는 화면 로컬 상태로만 산다 — 목업 id를 타일로 바꿔 시작한다.
function toGalleryState(gallery: GalleryMonth[]): GalleryMonthState[] {
  return gallery.map((section) => ({
    month: section.month,
    tiles: section.photoIds.map((id) => ({ id })),
  }));
}

// 개별 셀 페이지. 커버 사진 아래 소식/갤러리/구성원/관리 4탭이 붙고, 탭 바는 스크롤 시
// 상단에 고정된다(stickyHeaderIndices). 어떤 셀이든 cellId만 받아 그린다 — 셀은 관리자가
// 만들고 종료하는 유동 데이터라 화면이 특정 셀을 몰라야 한다.
// 시안의 갤러리-관리/선택은 별도 화면이 아니라 갤러리 탭의 편집·선택 모드로 구현했다
// (탭 구조를 유지한 채 같은 동작이 나온다 — 화면 분리가 필요해지면 그때 라우트로 뺀다).
export function CellDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "CellDetail">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { cellId } = route.params;

  const { members, news, gallery } = getCellDetail(cellId);
  // 작성·업로드(canPost)는 그 셀에 속한 누구나, 삭제·관리 탭(canManage)은 셀장·관리자만.
  const canPost = canPostToCell(cellId);
  const canManage = canManageCell(cellId);

  const [activeTab, setActiveTab] = useState<CellTabKey>("news");
  const [galleryMonths, setGalleryMonths] = useState<GalleryMonthState[]>(() =>
    toGalleryState(gallery),
  );
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const deleteDialogRef = useRef<AppDialogRef>(null);

  const totalPhotoCount = galleryMonths.reduce((sum, section) => sum + section.tiles.length, 0);

  const handleTabChange = (tab: CellTabKey) => {
    // 갤러리 선택 모드는 갤러리 탭 안의 상태라 탭을 떠나면 정리한다.
    setSelecting(false);
    setSelectedIds([]);
    setActiveTab(tab);
  };

  const handleEditTogglePress = () => {
    setSelecting((prev) => !prev);
    setSelectedIds([]);
  };

  const handleTilePress = (tile: GalleryTile, flatIndex: number) => {
    if (selecting) {
      setSelectedIds((prev) =>
        prev.includes(tile.id) ? prev.filter((id) => id !== tile.id) : [...prev, tile.id],
      );
      return;
    }
    navigation.navigate("CellGalleryPhoto", { cellId, index: flatIndex });
  };

  // 시스템 포토 피커라 별도 권한 요청이 필요 없다 (PhotoUploadBox와 동일).
  // TODO(API): 업로드 연동 전이라 화면 로컬 목록에만 붙는다.
  const handleAddPhotoPress = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setGalleryMonths((prev) =>
      prev.map((section, index) =>
        index === 0 ? { ...section, tiles: [{ id: uri, uri }, ...section.tiles] } : section,
      ),
    );
  };

  const confirmDeleteSelected = () => {
    // TODO(API): 삭제 연동 전 — 화면 로컬 목록에서만 지운다.
    setGalleryMonths((prev) =>
      prev.map((section) => ({
        ...section,
        tiles: section.tiles.filter((tile) => !selectedIds.includes(tile.id)),
      })),
    );
    setSelectedIds([]);
    setSelecting(false);
    deleteDialogRef.current?.close();
  };

  // 뷰어에 넘길 평탄화 인덱스 — 월 섹션을 순서대로 이어붙인 위치다.
  let flatOffset = 0;

  return (
    <View className="flex-1 bg-background-normal">
      <ScrollView stickyHeaderIndices={[1]}>
        {/* TODO(사진): 셀 커버 사진 연동 전 placeholder (시안 402x402) */}
        <View className="aspect-square w-full bg-background-muted" />

        <CellTabBar active={activeTab} onChange={handleTabChange} manageLocked={!canManage} />

        {activeTab === "news" && (
          <View className="px-5 pb-10">
            {news.map((item) => (
              <CellNewsRow
                key={item.id}
                news={item}
                onPress={() => navigation.navigate("CellNewsDetail", { cellId, newsId: item.id })}
              />
            ))}
          </View>
        )}

        {activeTab === "gallery" && (
          <View className="px-5 pb-10 pt-4">
            {canPost && (
              <View className="mb-4 h-6 items-center justify-center">
                <Text className="text-caption-main text-text-alternative">
                  전체 {totalPhotoCount}장
                </Text>
                {canManage && (
                  <Pressable className="absolute right-0" onPress={handleEditTogglePress}>
                    <Text className="text-body-main text-primary-normal">
                      {selecting ? "완료" : "편집"}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
            <View className="gap-6">
              {galleryMonths.map((section) => {
                const sectionOffset = flatOffset;
                flatOffset += section.tiles.length;
                return (
                  <GalleryMonthGrid
                    key={section.month}
                    month={section.month}
                    tiles={section.tiles}
                    selecting={selecting}
                    selectedIds={selectedIds}
                    onTilePress={(tile) =>
                      handleTilePress(tile, sectionOffset + section.tiles.indexOf(tile))
                    }
                    onAddPress={
                      canPost && !selecting && section === galleryMonths[0]
                        ? handleAddPhotoPress
                        : undefined
                    }
                  />
                );
              })}
            </View>
          </View>
        )}

        {activeTab === "members" && (
          <View className="items-center gap-4.5 pb-10 pt-10">
            {chunkMembers(members).map((row, rowIndex) => (
              <View key={rowIndex} className="flex-row gap-15">
                {row.map((member) => (
                  <CellMemberItem key={member.id} member={member} />
                ))}
                {/* 마지막 줄이 3칸을 못 채워도 열이 흐트러지지 않게 자리만 채운다 */}
                {Array.from({ length: MEMBER_COLUMNS - row.length }, (_, i) => (
                  <View key={`filler-${i}`} className="w-15" />
                ))}
              </View>
            ))}
          </View>
        )}

        {activeTab === "manage" && (
          <View className="px-5 pb-10 pt-5">
            <View className="self-start rounded-5 bg-background-gold px-2.5 py-1">
              <Text className="text-caption-main text-semantic-warning">
                셀장 · 관리자만 볼 수 있어요
              </Text>
            </View>
            <View className="mt-6 gap-4.5">
              <ManageLinkCard
                title="팔로워 노트"
                description="셀원별 케어 기록을 남기고 확인해요"
                onPress={() => navigation.navigate("FollowerNoteBoard", { cellId })}
              />
              <ManageLinkCard
                title="출석 관리"
                description="셀원들의 출석을 관리해요"
                onPress={() => navigation.navigate("CellAttendance", { cellId })}
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* 소식 글쓰기 진입 — 시안에 진입 버튼이 명시돼 있지 않아 팔로워노트 게시판과 같은
          플로팅 버튼으로 달았다 (그 셀 소속 유저만). 시안 확정 시 위치 조정. */}
      {activeTab === "news" && canPost && (
        <FloatingButton onPress={() => navigation.navigate("CellNewsWrite", { cellId })}>
          <Icon name="write" size={24} color={colors.icon.disable} />
        </FloatingButton>
      )}

      {/* 갤러리 선택 모드 하단 바 (시안: "N장 선택됨" + 삭제) */}
      {selecting && (
        <View
          className="flex-row items-center justify-between bg-background-normal px-5 py-5"
          style={{
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.background.assistive,
          }}
        >
          <Text className="text-body-medium text-text-alternative">
            {selectedIds.length}장 선택됨
          </Text>
          <Pressable
            className="flex-row items-center gap-1"
            disabled={selectedIds.length === 0}
            onPress={() => deleteDialogRef.current?.open()}
          >
            <Icon name="trash-can" size={18} color={colors.semantic.danger} />
            <Text className="text-body-medium text-semantic-danger">삭제</Text>
          </Pressable>
        </View>
      )}

      <AppDialog
        ref={deleteDialogRef}
        title="선택한 사진을 삭제하시겠습니까?"
        description="삭제된 사진은 복구할 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={confirmDeleteSelected}
      />
    </View>
  );
}

function chunkMembers(members: CellMember[]): CellMember[][] {
  const rows: CellMember[][] = [];
  for (let i = 0; i < members.length; i += MEMBER_COLUMNS) {
    rows.push(members.slice(i, i + MEMBER_COLUMNS));
  }
  return rows;
}
