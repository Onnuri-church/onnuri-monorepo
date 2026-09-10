import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";

import { Icon } from "../../shared/components/base/Icon";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { CELLS, type Cell } from "../cell/cells";

// 마이페이지 관리자 메뉴 > 셀 관리 — 전체 셀 목록에서 생성(헤더)·편집·삭제(행 스와이프)한다.
// 목록은 셀 페이지 목업(cells.ts)을 그대로 쓰고, 삭제는 API 연동 전이라 화면 로컬로만 지운다.
export function AdminCellManageScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [cells, setCells] = useState(CELLS);
  const [deleteTarget, setDeleteTarget] = useState<Cell | null>(null);

  const handleEditPress = (cellId: string) => {
    navigation.navigate("AdminCellForm", { cellId });
  };

  const handleDeleteConfirmPress = () => {
    // TODO(API): 셀 soft delete 연동 — 지금은 로컬 목록에서만 지운다.
    setCells((prev) => prev.filter((cell) => cell.id !== deleteTarget?.id));
    setDeleteTarget(null);
  };

  return (
    <ScrollView className="bg-background-normal" contentContainerClassName="pb-10 pt-2">
      {cells.map((cell, index) => (
        <View key={cell.id}>
          {index > 0 && <View className="mx-5 h-px bg-background-muted" />}
          {/* 스와이프하면 오른쪽에 편집(연필)·삭제(휴지통) 액션이 나온다 (2026-09-08 시안). */}
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
                셀장 {cell.leaderName}
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
