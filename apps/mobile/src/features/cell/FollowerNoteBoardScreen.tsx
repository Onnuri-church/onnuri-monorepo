import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { FollowerNoteCommentInfo } from "@onnuri/shared";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { FloatingButton } from "../../shared/components/base/FloatingButton";
import { Icon } from "../../shared/components/base/Icon";
import { KeyboardAvoidingContainer } from "../../shared/components/base/KeyboardAvoidingContainer";
import { CommentInput } from "../../shared/components/composed/CommentInput";
import { colors } from "../../shared/theme/tokens";
import { useThemeColors } from "../../shared/theme/useThemeColors";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useMe } from "../profile/useMe";
import {
  useAddFollowerNoteComment,
  useCell,
  useDeleteFollowerNote,
  useDeleteFollowerNoteComment,
  useFollowerNotes,
  useUpdateFollowerNoteComment,
} from "./api";
import { canWriteFollowerNote } from "./cellDetail";
import { FollowerNoteCard } from "./components/FollowerNoteCard";
import { MonthPicker } from "./components/MonthPicker";

// 팔로워 노트 게시판 (관리 탭 > 팔로워 노트 — 셀장·관리자 전용 경로로만 진입한다).
// "2026년 8월"을 누르면 월 달력이 펼쳐지고, 달이나 전체 기간을 고르면 목록이 걸러진다 (시안).
// 상세 화면은 따로 두지 않는다 — 카드를 누르면 그 자리에서 내용과 댓글이 펼쳐지고, 펼친 노트가 있을 때만
// 화면 아래에 댓글 입력창이 붙는다 (SCRUM-182). 알림으로 들어오면(noteId) 그 노트를 펼쳐서 보여준다.
export function FollowerNoteBoardScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const route = useRoute<RouteProp<RootStackParamList, "FollowerNoteBoard">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { cellId, noteId: targetNoteId } = route.params;
  const cell = useCell(cellId);
  // 작성·편집·삭제는 그 셀의 셀장·부셀장만 — 관리자는 열람과 댓글(목사님 댓글)만 (2026-09-10 확정).
  const me = useMe();
  const canWrite = canWriteFollowerNote(cellId, me);

  const { data: notes, isLoading, refetch, isRefetching } = useFollowerNotes(cellId);
  const deleteNote = useDeleteFollowerNote(cellId);
  const addComment = useAddFollowerNoteComment(cellId);
  const updateComment = useUpdateFollowerNoteComment(cellId);
  const deleteComment = useDeleteFollowerNoteComment(cellId);
  // null = 전체 기간
  const [monthFilter, setMonthFilter] = useState<number | null>(new Date().getMonth() + 1);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const deleteDialogRef = useRef<AppDialogRef>(null);
  const deleteTargetId = useRef<string | null>(null);

  // 한 번에 한 노트만 펼친다 — 긴 노트 여러 개가 한꺼번에 열려 목록이 끝없이 길어지지 않게.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  // 답글 대상과 수정 중인 댓글 — 입력창 하나를 모드만 바꿔 쓴다 (부서활동 상세와 같은 방식).
  const [replyTo, setReplyTo] = useState<FollowerNoteCommentInfo | null>(null);
  const [editing, setEditing] = useState<FollowerNoteCommentInfo | null>(null);

  // 펼친 카드로 스크롤하기 위한 위치 — 목록 묶음의 y + 묶음 안 카드의 y.
  const scrollRef = useRef<ScrollView>(null);
  const listY = useRef(0);
  const cardY = useRef(new Map<string, number>());
  const pendingScrollId = useRef<string | null>(null);

  const visibleNotes =
    monthFilter === null
      ? (notes ?? [])
      : (notes ?? []).filter((note) => note.month === monthFilter);
  const expandedNote = visibleNotes.find((note) => note.id === expandedId);

  const resetComposer = () => {
    setCommentDraft("");
    setReplyTo(null);
    setEditing(null);
  };

  const expand = (id: string | null) => {
    resetComposer();
    setExpandedId(id);
    if (id) pendingScrollId.current = id;
  };

  // 알림으로 들어온 노트는 그 달로 필터를 맞추고 펼친다 (목록이 처음 로드됐을 때 한 번).
  const handledTarget = useRef(false);
  useEffect(() => {
    if (handledTarget.current || !targetNoteId || !notes) return;
    handledTarget.current = true;
    const target = notes.find((note) => note.id === targetNoteId);
    if (!target) return;
    setMonthFilter(target.month);
    expand(target.id);
  }, [notes, targetNoteId]);

  // 펼친 카드의 새 위치가 잡힌 뒤(onLayout) 그 카드 머리로 스크롤한다.
  const scrollToPending = (id: string) => {
    if (pendingScrollId.current !== id) return;
    const y = cardY.current.get(id);
    if (y === undefined) return;
    pendingScrollId.current = null;
    scrollRef.current?.scrollTo({ y: Math.max(listY.current + y - 12, 0), animated: true });
  };

  const handleDeletePress = (noteId: string) => {
    deleteTargetId.current = noteId;
    deleteDialogRef.current?.open();
  };

  const confirmDelete = () => {
    if (deleteTargetId.current && !deleteNote.isPending) {
      if (deleteTargetId.current === expandedId) expand(null);
      deleteNote.mutate(deleteTargetId.current);
    }
    deleteDialogRef.current?.close();
  };

  const handleCommentSubmit = () => {
    const content = commentDraft.trim();
    if (!expandedId || !content || addComment.isPending || updateComment.isPending) return;
    if (editing) {
      updateComment.mutate(
        { noteId: expandedId, commentId: editing.id, content },
        {
          onSuccess: resetComposer,
          onError: () =>
            Alert.alert(t("댓글을 수정하지 못했어요"), t("잠시 후 다시 시도해주세요.")),
        },
      );
      return;
    }
    addComment.mutate(
      { noteId: expandedId, content, parentId: replyTo?.id },
      { onSuccess: resetComposer },
    );
  };

  const handleReplyComment = (comment: FollowerNoteCommentInfo) => {
    setEditing(null);
    setCommentDraft("");
    setReplyTo(comment);
  };

  const handleEditComment = (comment: FollowerNoteCommentInfo) => {
    setReplyTo(null);
    setEditing(comment);
    setCommentDraft(comment.content);
  };

  // 원댓글을 지우면 달린 답글도 서버가 같이 지우므로, 답글이 있으면 그 사실을 미리 알린다.
  const handleDeleteComment = (comment: FollowerNoteCommentInfo) => {
    if (!expandedNote) return;
    const hasReplies = expandedNote.comments.some((item) => item.parentId === comment.id);
    Alert.alert(
      t("댓글을 삭제할까요?"),
      hasReplies
        ? t("달린 답글도 함께 삭제되고, 되돌릴 수 없어요.")
        : t("삭제한 댓글은 되돌릴 수 없어요."),
      [
        { text: t("취소"), style: "cancel" },
        {
          text: t("삭제"),
          style: "destructive",
          onPress: () =>
            deleteComment.mutate(
              { noteId: expandedNote.id, commentId: comment.id },
              {
                onError: () =>
                  Alert.alert(t("댓글을 지우지 못했어요"), t("잠시 후 다시 시도해주세요.")),
              },
            ),
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-background-normal">
      <KeyboardAvoidingContainer>
        {/* 헤더 타이틀 아래 셀 이름 캡션 (시안) */}
        <Text className="text-center text-caption-main text-text-alternative">
          {cell?.name ?? ""}
        </Text>

        <ScrollView
          ref={scrollRef}
          contentContainerClassName="px-5 pt-5"
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
          // 안전영역은 바깥 틀이 띄우므로 여기는 FAB에 마지막 카드가 가리지 않을 만큼만 둔다.
          contentContainerStyle={{ paddingBottom: 96 }}
        >
          <Pressable
            className="flex-row items-center gap-1 self-start"
            onPress={() => setCalendarOpen((prev) => !prev)}
          >
            <Text className="text-heading-small text-text-normal">
              {monthFilter === null ? t("전체 기간") : t("2026년 {{month}}월", { month: monthFilter })}
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

          <View
            className="mt-6 gap-7"
            onLayout={(event) => {
              listY.current = event.nativeEvent.layout.y;
            }}
          >
            {visibleNotes.map((note) => (
              <View
                key={note.id}
                onLayout={(event) => {
                  cardY.current.set(note.id, event.nativeEvent.layout.y);
                  scrollToPending(note.id);
                }}
              >
                <FollowerNoteCard
                  note={note}
                  expanded={note.id === expandedId}
                  onToggle={() => expand(note.id === expandedId ? null : note.id)}
                  onEditPress={
                    canWrite
                      ? () => navigation.navigate("FollowerNoteWrite", { cellId, noteId: note.id })
                      : undefined
                  }
                  onDeletePress={canWrite ? () => handleDeletePress(note.id) : undefined}
                  onReplyComment={handleReplyComment}
                  onEditComment={handleEditComment}
                  onDeleteComment={handleDeleteComment}
                />
              </View>
            ))}
            {visibleNotes.length === 0 && (
              <Text className="pt-10 text-center text-body-medium text-text-alternative">
                {isLoading ? t("노트를 불러오고 있어요.") : t("이 기간에 작성된 노트가 없어요.")}
              </Text>
            )}
          </View>
        </ScrollView>

        {expandedNote && (
          <View
            className="px-5 pb-2 pt-3"
            style={{
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: themeColors.background.assistive,
            }}
          >
            {/* 수정·답글 중일 때만 무엇을 하는 중인지 보여주고 빠져나갈 길을 준다. */}
            {editing && (
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-body-small text-text-alternative">{t("댓글 수정 중")}</Text>
                <Pressable onPress={resetComposer} hitSlop={8}>
                  <Text className="text-body-small text-text-alternative">{t("취소")}</Text>
                </Pressable>
              </View>
            )}
            {replyTo && !editing && (
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-body-small text-text-alternative">
                  {t("{{name}}님에게 답글", { name: replyTo.authorName })}
                </Text>
                <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
                  <Text className="text-body-small text-text-alternative">{t("취소")}</Text>
                </Pressable>
              </View>
            )}
            <CommentInput
              value={commentDraft}
              onChangeText={setCommentDraft}
              onSubmit={handleCommentSubmit}
              placeholder={replyTo ? t("답글을 입력하세요") : t("답변을 남겨보세요.")}
            />
          </View>
        )}
      </KeyboardAvoidingContainer>

      {/* 노트를 펼쳐 댓글을 쓰는 동안은 입력창과 겹치지 않게 작성 버튼을 숨긴다. */}
      {canWrite && !expandedNote && (
        <FloatingButton onPress={() => navigation.navigate("FollowerNoteWrite", { cellId })}>
          <Icon name="write" size={24} color={colors.icon.disable} />
        </FloatingButton>
      )}

      <AppDialog
        ref={deleteDialogRef}
        title={t("정말 삭제하시겠습니까?")}
        description={t("삭제된 데이터는 복구할 수 없습니다.")}
        confirmLabel={t("확인")}
        cancelLabel={t("취소")}
        onConfirm={confirmDelete}
      />
    </View>
  );
}
