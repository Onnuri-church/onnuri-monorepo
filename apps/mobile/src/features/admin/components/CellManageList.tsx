import type { CellSummary } from "@onnuri/shared";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";

import { Icon } from "../../../shared/components/base/Icon";
import { colors } from "../../../shared/theme/tokens";
import type { RootStackParamList } from "../../../shared/types/navigation";
import { useCells } from "../../cell/api";

interface CellManageListProps {
  /** 탭 안에서 쓸 때 목록 끝이 탭바에 가리지 않게 주는 바닥 여백 (스택 화면은 0). */
  bottomInset?: number;
}

// 셀 관리 목록 — 행 스와이프로 편집(연필)·삭제(휴지통), 행 탭은 그 셀 페이지로 (2026-09-08 시안).
// 관리자 마이페이지의 셀 관리 화면과, 관리자용 하단 탭 "셀 페이지"가 같이 쓴다.
export function CellManageList({ bottomInset = 0 }: CellManageListProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // 목록은 서버(전체 셀)에서 온다. TODO(API): 삭제는 아직 미연동 — 로컬에서 숨기기만 한다.
  const { data } = useCells();
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const cells = (data ?? []).filter((cell) => !removedIds.includes(cell.id));
  const [deleteTarget, setDeleteTarget] = useState<CellSummary | null>(null);

  const handleEditPress = (cellId: string) => {
    navigation.navigate("AdminCellForm", { cellId });
  };

  const handleDeleteConfirmPress = () => {
    // TODO(API): 셀 soft delete 연동 — 지금은 로컬에서 숨기기만 한다.
    if (deleteTarget) {
      setRemovedIds((prev) => [...prev, deleteTarget.id]);
    }
    setDeleteTarget(null);
  };

  return (
    <ScrollView
      className="bg-background-normal"
      contentContainerClassName="pt-2"
      // 기본 바닥 여백 40(pb-10) + 탭 안에서는 탭바만큼 추가
      contentContainerStyle={{ paddingBottom: 40 + bottomInset }}
    >
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

      {/* 삭제 확인 모달 — 셀 삭제는 기록 보존(soft delete) 정책이라 회원 삭제 모달과 같은 결의 문구를 쓴다. */}
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
