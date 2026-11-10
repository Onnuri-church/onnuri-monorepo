import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { FollowerNoteCommentInfo } from "@onnuri/shared";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, RefreshControl, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { ContextMenu } from "../../shared/components/base/ContextMenu";
import { FilterChip } from "../../shared/components/base/FilterChip";
import { FloatingButton } from "../../shared/components/base/FloatingButton";
import { Icon } from "../../shared/components/base/Icon";
import { KeyboardAvoidingContainer } from "../../shared/components/base/KeyboardAvoidingContainer";
import { PickerPill } from "../../shared/components/composed/PickerPill";
import { colors } from "../../shared/theme/tokens";
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
import { FollowerNoteCard, type MenuAnchor } from "./components/FollowerNoteCard";

// 팔로워 노트 게시판 (관리 탭 > 팔로워 노트 — 셀장·관리자 전용 경로로만 진입한다).
// 위쪽 연·월 버튼(큐티나눔과 같은 PickerPill)으로 그 달 노트만 보고, 오른쪽 "전체 기간" 칩으로 전부 본다.
// 상세 화면은 따로 두지 않는다 — 카드를 누르면 그 자리에서 내용·댓글·댓글 입력창이 펼쳐진다 (SCRUM-182).
// 수정·삭제는 펼친 카드의 ⋮ 메뉴에만 둔다. 알림으로 들어오면(noteId) 그 노트를 펼쳐서 보여준다.
export function FollowerNoteBoardScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
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
  // 보고 있는 연·월과 전체 기간 여부 — 전체 기간을 켜도 연·월 버튼은 마지막 값을 그대로 보여준다.
  const today = new Date();
  const [pick, setPick] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 });
  const [showAll, setShowAll] = useState(false);
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
  const cardLayout = useRef(new Map<string, { y: number; height: number }>());
  const viewportHeight = useRef(0);
  const scrollY = useRef(0);
  // ⋮ 메뉴 — 누른 버튼 아래에 붙인다 (큐티나눔 게시판과 같은 방식).
  const [menu, setMenu] = useState<{ id: string; top: number; right: number } | null>(null);
  const pendingScrollId = useRef<string | null>(null);

  const visibleNotes = showAll
    ? (notes ?? [])
    : (notes ?? []).filter((note) => note.year === pick.year && note.month === pick.month);
  // 연도 선택지 — 노트가 있는 해 + 올해 (노트는 몇 년치만 쌓이므로 목록에서 바로 뽑는다).
  const yearOptions = [...new Set([today.getFullYear(), ...(notes ?? []).map((note) => note.year)])]
    .sort((a, b) => b - a)
    .map((year) => ({ value: year, label: t("{{year}}년", { year }) }));
  const monthOptions = Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: t("{{month}}월", { month: index + 1 }),
  }));
  const handlePick = (next: { year: number; month: number }) => {
    setPick(next);
    setShowAll(false);
  };
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
    setPick({ year: target.year, month: target.month });
    setShowAll(false);
    expand(target.id);
  }, [notes, targetNoteId]);

  // 펼친 카드의 새 위치가 잡힌 뒤(onLayout) 그 카드 머리로 스크롤한다.
  const scrollToPending = (id: string) => {
    if (pendingScrollId.current !== id) return;
    const layout = cardLayout.current.get(id);
    if (!layout) return;
    pendingScrollId.current = null;
    scrollRef.current?.scrollTo({ y: Math.max(listY.current + layout.y - 12, 0), animated: true });
  };

  // 카드 맨 아래 댓글 입력창을 누르면 키보드가 올라온 뒤 그 카드 바닥이 보이게 스크롤한다
  // (키보드가 열리면 바깥 틀이 줄어들어 ScrollView 높이가 바뀐다 — 그걸 기다린다).
  const handleComposerFocus = (id: string) => {
    setTimeout(() => {
      const layout = cardLayout.current.get(id);
      if (!layout) return;
      const bottom = listY.current + layout.y + layout.height + 16;
      const target = bottom - viewportHeight.current;
      if (target > scrollY.current) scrollRef.current?.scrollTo({ y: target, animated: true });
    }, 350);
  };

  const handleMenuPress = (id: string, anchor: MenuAnchor) =>
    setMenu({ id, top: anchor.y + anchor.height + 4, right: windowWidth - (anchor.x + anchor.width) });

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

        <View className="flex-row items-center justify-between px-5 pb-1 pt-4">
          <View className="flex-row items-center gap-2">
            <PickerPill
              label={t("{{year}}년", { year: pick.year })}
              options={yearOptions}
              selected={pick.year}
              onSelect={(year) => handlePick({ year, month: pick.month })}
            />
            <PickerPill
              label={t("{{month}}월", { month: pick.month })}
              options={monthOptions}
              selected={pick.month}
              onSelect={(month) => handlePick({ year: pick.year, month })}
            />
          </View>
          <FilterChip label={t("전체 기간")} selected={showAll} onPress={() => setShowAll((prev) => !prev)} />
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerClassName="px-5 pt-5"
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={32}
          onScroll={(event) => {
            scrollY.current = event.nativeEvent.contentOffset.y;
          }}
          onLayout={(event) => {
            viewportHeight.current = event.nativeEvent.layout.height;
          }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
          // 안전영역은 바깥 틀이 띄우므로 여기는 FAB에 마지막 카드가 가리지 않을 만큼만 둔다.
          contentContainerStyle={{ paddingBottom: 96 }}
        >
          <View
            className="gap-7"
            onLayout={(event) => {
              listY.current = event.nativeEvent.layout.y;
            }}
          >
            {visibleNotes.map((note) => (
              <View
                key={note.id}
                onLayout={(event) => {
                  const { y, height } = event.nativeEvent.layout;
                  cardLayout.current.set(note.id, { y, height });
                  scrollToPending(note.id);
                }}
              >
                <FollowerNoteCard
                  note={note}
                  expanded={note.id === expandedId}
                  onToggle={() => expand(note.id === expandedId ? null : note.id)}
                  onMenuPress={canWrite ? (anchor) => handleMenuPress(note.id, anchor) : undefined}
                  onReplyComment={handleReplyComment}
                  onEditComment={handleEditComment}
                  onDeleteComment={handleDeleteComment}
                  draft={note.id === expandedId ? commentDraft : ""}
                  onDraftChange={setCommentDraft}
                  onSubmitComment={handleCommentSubmit}
                  replyTo={note.id === expandedId ? replyTo : null}
                  editing={note.id === expandedId ? editing : null}
                  onCancelComposerMode={resetComposer}
                  onComposerFocus={() => handleComposerFocus(note.id)}
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

      </KeyboardAvoidingContainer>

      {/* 노트를 펼친 동안은 카드 아래 댓글 입력창과 겹치지 않게 작성 버튼을 숨긴다. */}
      {canWrite && !expandedNote && (
        <FloatingButton onPress={() => navigation.navigate("FollowerNoteWrite", { cellId })}>
          <Icon name="write" size={24} color={colors.icon.disable} />
        </FloatingButton>
      )}

      <ContextMenu
        visible={menu !== null}
        onClose={() => setMenu(null)}
        style={menu ? { top: menu.top, right: menu.right } : undefined}
        items={[
          {
            icon: "edit",
            label: t("수정하기"),
            onPress: () => menu && navigation.navigate("FollowerNoteWrite", { cellId, noteId: menu.id }),
          },
          {
            icon: "trash-can",
            label: t("삭제하기"),
            onPress: () => menu && handleDeletePress(menu.id),
          },
        ]}
      />

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
