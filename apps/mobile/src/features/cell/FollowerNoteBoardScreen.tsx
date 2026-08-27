import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { FloatingButton } from "../../shared/components/base/FloatingButton";
import { Icon } from "../../shared/components/base/Icon";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { findCell } from "./cells";
import { MonthPicker } from "./components/MonthPicker";
import { FollowerNoteCard } from "./components/FollowerNoteCard";
import { getFollowerNotes, type FollowerNote } from "./followerNotes";

// 팔로워 노트 게시판 (관리 탭 > 팔로워 노트 — 셀장·관리자 전용 경로로만 진입한다).
// "2026년 8월"을 누르면 월 달력이 펼쳐지고, 달이나 전체 기간을 고르면 목록이 걸러진다 (시안).
export function FollowerNoteBoardScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "FollowerNoteBoard">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { cellId } = route.params;
  const cell = findCell(cellId);

  // TODO(API): 노트 목록 연동 전 — 삭제까지 화면 로컬로만 동작한다.
  const [notes, setNotes] = useState<FollowerNote[]>(() => getFollowerNotes(cellId));
  // null = 전체 기간
  const [monthFilter, setMonthFilter] = useState<number | null>(new Date().getMonth() + 1);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const deleteDialogRef = useRef<AppDialogRef>(null);
  const deleteTargetId = useRef<string | null>(null);

  const visibleNotes =
    monthFilter === null ? notes : notes.filter((note) => note.month === monthFilter);

  const handleDeletePress = (noteId: string) => {
    deleteTargetId.current = noteId;
    deleteDialogRef.current?.open();
  };

  const confirmDelete = () => {
    setNotes((prev) => prev.filter((note) => note.id !== deleteTargetId.current));
    deleteDialogRef.current?.close();
  };

  return (
    <View className="flex-1 bg-background-normal">
      {/* 헤더 타이틀 아래 셀 이름 캡션 (시안) */}
      <Text className="text-center text-caption-main text-text-alternative">
        {cell?.name ?? ""}
      </Text>

      <ScrollView contentContainerClassName="px-5 pb-10 pt-5">
        <Pressable
          className="flex-row items-center gap-1 self-start"
          onPress={() => setCalendarOpen((prev) => !prev)}
        >
          <Text className="text-heading-small text-text-normal">
            {monthFilter === null ? "전체 기간" : `2026년 ${monthFilter}월`}
          </Text>
          <Icon name="arrow-drop-down" size={24} color={colors.icon.strong} />
        </Pressable>

        {calendarOpen && (
          <View className="mt-4">
            <MonthPicker
              selectedMonth={monthFilter}
              onSelectMonth={(month) => {
                setMonthFilter(month);
                setCalendarOpen(false);
              }}
              onSelectAll={() => {
                setMonthFilter(null);
                setCalendarOpen(false);
              }}
            />
          </View>
        )}

        <View className="mt-6 gap-7">
          {visibleNotes.map((note) => (
            <FollowerNoteCard
              key={note.id}
              note={note}
              onPress={() =>
                navigation.navigate("FollowerNoteDetail", { cellId, noteId: note.id })
              }
              // 작성자(셀장) 본인 글 목업 — 작성자 API가 붙으면 내 글 여부로 교체.
              onEditPress={() => navigation.navigate("FollowerNoteWrite", { cellId })}
              onDeletePress={() => handleDeletePress(note.id)}
            />
          ))}
          {visibleNotes.length === 0 && (
            <Text className="pt-10 text-center text-body-medium text-text-alternative">
              이 기간에 작성된 노트가 없어요.
            </Text>
          )}
        </View>
      </ScrollView>

      <FloatingButton onPress={() => navigation.navigate("FollowerNoteWrite", { cellId })}>
        <Icon name="write" size={24} color={colors.icon.disable} />
      </FloatingButton>

      <AppDialog
        ref={deleteDialogRef}
        title="정말 삭제하시겠습니까?"
        description="삭제된 데이터는 복구할 수 없습니다."
        confirmLabel="확인"
        cancelLabel="취소"
        onConfirm={confirmDelete}
      />
    </View>
  );
}
