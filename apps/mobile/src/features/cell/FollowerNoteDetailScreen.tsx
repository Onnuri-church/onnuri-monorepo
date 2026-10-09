import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "../../shared/components/base/Avatar";
import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { Header } from "../../shared/components/base/Header";
import { CommentEmpty } from "../../shared/components/composed/CommentEmpty";
import { useKeyboardHeight } from "../../shared/hooks/useKeyboardHeight";
import { CommentInput } from "../../shared/components/composed/CommentInput";
import { CommentItem } from "../../shared/components/composed/CommentItem";
import { useThemeColors } from "../../shared/theme/useThemeColors";
import type { RootStackParamList } from "../../shared/types/navigation";
import { toTimeAgo } from "../../shared/utils/date";
import {
  useAddFollowerNoteComment,
  useDeleteFollowerNote,
  useFollowerNotes,
} from "./api";
import { NoteNumberBadge } from "./components/NoteNumberBadge";
import { getNoteQuestions } from "./followerNotes";

// 팔로워 노트 게시글 (시안: 작성자 프로필 + 셀장 뱃지 + 날짜 제목 + 3문항 + 댓글).
export function FollowerNoteDetailScreen() {
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const route = useRoute<RouteProp<RootStackParamList, "FollowerNoteDetail">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { cellId, noteId } = route.params;

  // 게시판을 거쳐 들어오므로 목록 캐시에서 찾는다 (목록 응답이 상세 전체를 담는 계약).
  const { data: notes } = useFollowerNotes(cellId);
  const note = notes?.find((item) => item.id === noteId);
  const deleteDialogRef = useRef<AppDialogRef>(null);

  const deleteNote = useDeleteFollowerNote(cellId);
  const addComment = useAddFollowerNoteComment(cellId);
  const comments = note?.comments ?? [];
  const [commentDraft, setCommentDraft] = useState("");

  // ⋮ 항목이 내 글 여부에 의존하므로 화면이 헤더를 단독 등록한다 (QtBoardDetail 패턴).
  // 수정·삭제는 작성자(셀장) 본인만 — 관리자는 열람·댓글만 한다 (서버 권한과 동일).
  const isMine = note?.isMine ?? false;
  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <Header
          variant="sub"
          title={t("팔로워 노트")}
          rightAction={isMine ? "more" : "none"}
          menuItems={[
            {
              icon: "edit",
              label: t("수정하기"),
              onPress: () => navigation.navigate("FollowerNoteWrite", { cellId, noteId }),
            },
            {
              icon: "trash-can",
              label: t("삭제하기"),
              onPress: () => deleteDialogRef.current?.open(),
            },
          ]}
        />
      ),
    });
  }, [navigation, cellId, noteId, isMine, t]);

  const confirmDelete = () => {
    deleteDialogRef.current?.close();
    deleteNote.mutate(noteId, { onSuccess: () => navigation.goBack() });
  };

  const handleCommentSubmit = () => {
    const content = commentDraft.trim();
    if (!content || addComment.isPending) return;
    addComment.mutate({ noteId, content }, { onSuccess: () => setCommentDraft("") });
  };

  if (!note) {
    return (
      <View className="flex-1 items-center justify-center bg-background-normal">
        <Text className="text-body-medium text-text-alternative">{t("노트를 찾을 수 없어요.")}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-normal">
      <View style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <View className="px-5 pt-4">
            <View className="flex-row items-center gap-2">
              <Avatar imageUrl={note.authorAvatarUrl} size={42} />
              <View>
                <View className="flex-row items-center gap-1">
                  <Text className="text-heading-small text-text-normal">{note.authorName}</Text>
                  <View className="rounded-full bg-primary-normal px-2 py-0.5">
                    <Text className="text-caption-small text-text-disable">{t("셀장")}</Text>
                  </View>
                </View>
                <Text className="text-body-small text-text-alternative">
                  {note.writtenDateLabel} · {toTimeAgo(note.createdAt)}
                </Text>
              </View>
            </View>

            <Text className="mt-6 text-heading-medium text-text-normal">
              {note.dateLabel} {note.meetingLabel}
            </Text>

            <View className="mt-6 gap-6">
              {getNoteQuestions().map((question, index) =>
                note.answers[index]?.trim() ? (
                  <View key={question.title} className="gap-2.5">
                    <View className="flex-row items-center gap-1">
                      <NoteNumberBadge number={index + 1} />
                      <Text className="text-body-main text-text-normal">{question.title}</Text>
                    </View>
                    <Text className="text-body-medium text-text-neutral">
                      {note.answers[index]}
                    </Text>
                  </View>
                ) : null,
              )}
            </View>
          </View>

          <View
            className="mt-8 px-5 pb-6 pt-4"
            style={{
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: themeColors.background.assistive,
            }}
          >
            <Text className="text-body-main text-text-normal">{t("댓글 {{count}}", { count: comments.length })}</Text>
            {comments.length === 0 ? (
              <CommentEmpty />
            ) : (
              <View className="mt-2">
                {comments.map((comment) => (
                  /* 대댓글(parentId 있음)은 시안처럼 한 단계 들여쓴다. */
                  <View key={comment.id} className={comment.parentId ? "pl-10" : ""}>
                    <CommentItem
                      authorName={comment.authorName}
                      timeAgo={comment.dateLabel}
                      content={comment.content}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        <View
          className="px-5 pt-3"
          style={{
            // 키보드가 올라오면 그 높이만큼 띄운다 — 이때 내비 바 인셋은 더하지 않는다 (키보드가 그 자리를 덮는다).
            paddingBottom: (keyboardHeight || insets.bottom) + 8,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: themeColors.background.assistive,
          }}
        >
          <CommentInput
            value={commentDraft}
            onChangeText={setCommentDraft}
            onSubmit={handleCommentSubmit}
            placeholder={t("답변을 남겨보세요.")}
          />
        </View>
      </View>

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
