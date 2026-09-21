import type { CellSummary } from "@onnuri/shared";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";

import { Icon } from "../../../shared/components/base/Icon";
import { SearchBar } from "../../../shared/components/base/SearchBar";
import { colors } from "../../../shared/theme/tokens";
import type { RootStackParamList } from "../../../shared/types/navigation";
import { useCells } from "../../cell/api";
import { useDeleteCell } from "../api";

interface CellManageListProps {
  /** 탭 안에서 쓸 때 목록 끝이 탭바에 가리지 않게 주는 바닥 여백 (스택 화면은 0). */
  bottomInset?: number;
}

// 셀 관리 목록 — 검색바 + 행 스와이프로 편집(연필)·삭제(휴지통), 행 탭은 그 셀 페이지로,
// 생성은 목록 끝의 점선 "+ 셀 생성" 행 (2026-09-21 A안 시안 — 헤더 생성 버튼에서 이동).
// 관리자 마이페이지의 셀 관리 화면과, 관리자용 하단 탭 "셀 페이지"가 같이 쓴다.
export function CellManageList({ bottomInset = 0 }: CellManageListProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // 목록은 서버(전체 셀)에서 온다. 삭제는 DELETE /cells/:id (soft delete) — 성공하면
  // 셀 캐시가 무효화돼 목록에서 빠진다.
  const { data } = useCells();
  const [query, setQuery] = useState("");
  const cells = (data ?? []).filter((cell) =>
    query.trim() ? cell.name.includes(query.trim()) : true,
  );
  const [deleteTarget, setDeleteTarget] = useState<CellSummary | null>(null);
  const deleteCell = useDeleteCell();

  const handleEditPress = (cellId: string) => {
    navigation.navigate("AdminCellForm", { cellId });
  };

  const handleDeleteConfirmPress = () => {
    if (deleteTarget && !deleteCell.isPending) {
      deleteCell.mutate(deleteTarget.id);
    }
    setDeleteTarget(null);
  };

  return (
    <ScrollView
      className="bg-background-normal"
      contentContainerClassName="pt-2"
      // 기본 바닥 여백 40(pb-10) + 탭 안에서는 탭바만큼 추가
      contentContainerStyle={{ paddingBottom: 40 + bottomInset }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="px-5 pb-2">
        <SearchBar value={query} onChangeText={setQuery} placeholder="셀 이름으로 검색" />
      </View>

      {cells.map((cell, index) => (
        <View key={cell.id}>
          {index > 0 && <View className="mx-5 h-px bg-background-muted" />}
          <ReanimatedSwipeable
            renderRightActions={() => (
              <View className="flex-row items-center gap-6 px-6">
                <Pressable onPress={() => handleEditPress(cell.id)} hitSlop={8}>
                  <Icon name="edit" size={20} color={colors.icon.normal} />
                </Pressable>
                <Pressable onPress={() => setDeleteTarget(cell)} hitSlop={8}>
                  <Icon name="trash-can" size={20} color={colors.semantic.danger} />
                </Pressable>
              </View>
            )}
          >
            <Pressable
              className="bg-background-normal px-5 py-4"
              onPress={() => navigation.navigate("CellDetail", { cellId: cell.id })}
              style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
            >
              <Text className="text-body-main text-text-normal">{cell.name}</Text>
              <Text className="mt-1 text-caption-main text-text-alternative">
                셀장 {cell.leaderName ?? "미지정"}
                {cell.viceLeaderName ? ` · 부셀장 ${cell.viceLeaderName}` : ""}
              </Text>
            </Pressable>
          </ReanimatedSwipeable>
        </View>
      ))}

      {/* 셀 생성 — 시안: 목록 끝 점선 행(높이 60은 토큰에 없어 h-14로 근사), 검색 중에도 항상 노출 */}
      <Pressable
        className="mx-5 mt-4 h-14 flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-background-assistive"
        onPress={() => navigation.navigate("AdminCellForm", {})}
        style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
      >
        <Icon name="plus" size={16} color={colors.icon.normal} />
        <Text className="text-body-regular text-text-alternative">셀 생성</Text>
      </Pressable>

      {/* 삭제 확인 모달 — 문구는 소프트 삭제(출석 기명 보존) 정책 기준으로 확정 (2026-09-21 지환님).
          시안의 "복구할 수 없습니다"는 보존 정책 반영 전 문구라 쓰지 않는다 — 디자이너 전달 필요. */}
      <Modal transparent visible={deleteTarget !== null} animationType="fade">
        <View className="flex-1 items-center justify-center bg-background-dark/40 px-10">
          <View className="w-full rounded-5 bg-background-normal px-6 py-7">
            <Text className="text-center text-body-main text-text-normal">
              {deleteTarget?.name}을 삭제하시겠습니까?
            </Text>
            <Text className="mt-2 text-center text-body-regular text-text-alternative">
              셀 페이지는 삭제되지만,{"\n"}출석 기록은 보존됩니다.
            </Text>
            <View className="mt-5 flex-row justify-center gap-3.5">
              <Pressable
                className="h-8 w-24 items-center justify-center rounded bg-background-assistive"
                onPress={() => setDeleteTarget(null)}
                style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
              >
                <Text className="text-body-regular text-text-normal">취소</Text>
              </Pressable>
              <Pressable
                className="h-8 w-24 items-center justify-center rounded bg-semantic-danger"
                onPress={handleDeleteConfirmPress}
                style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
              >
                <Text className="text-body-regular text-text-disable">삭제</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
