import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useLayoutEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { Header } from "../../shared/components/base/Header";
import { CommentEmpty } from "../../shared/components/composed/CommentEmpty";
import { CommentInput } from "../../shared/components/composed/CommentInput";
import { CommentItem } from "../../shared/components/composed/CommentItem";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { NoteNumberBadge } from "./components/NoteNumberBadge";
import { NOTE_QUESTIONS, findFollowerNote, type NoteComment } from "./followerNotes";

// 팔로워 노트 게시글 (시안: 작성자 프로필 + 셀장 뱃지 + 날짜 제목 + 3문항 + 댓글).
export function FollowerNoteDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "FollowerNoteDetail">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { cellId, noteId } = route.params;

  const note = findFollowerNote(cellId, noteId);
  const deleteDialogRef = useRef<AppDialogRef>(null);

  // TODO(API): 댓글 등록 연동 전 — 화면 로컬 목록에만 쌓인다.
  const [comments, setComments] = useState<NoteComment[]>(note?.comments ?? []);
  const [commentDraft, setCommentDraft] = useState("");

  // ⋮ 항목이 내 글 여부에 의존하므로 화면이 헤더를 단독 등록한다 (QtBoardDetail 패턴).
  // 이 게시판은 셀장·관리자만 들어오고 목업 작성자가 셀장이라 항상 보인다 — 작성자 API로 교체 예정.
  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <Header
          variant="sub"
          title="팔로워 노트"
          rightAction="more"
          menuItems={[
            {
              icon: "edit",
              label: "수정하기",
              onPress: () => navigation.navigate("FollowerNoteWrite", { cellId }),
            },
            {
              icon: "trash-can",
              label: "삭제하기",
              onPress: () => deleteDialogRef.current?.open(),
            },
          ]}
        />
      ),
    });
  }, [navigation, cellId]);

  const confirmDelete = () => {
    // TODO(API): 삭제 연동 전 — 게시판으로 돌아가기만 한다.
    deleteDialogRef.current?.close();
    navigation.goBack();
  };

  const handleCommentSubmit = () => {
    const content = commentDraft.trim();
    if (!content) return;
    setComments((prev) => [
      ...prev,
      { id: String(prev.length + 1), authorName: "이서연", timeAgo: "방금 전", content, isPastor: false },
    ]);
    setCommentDraft("");
  };

  if (!note) {
    return (
      <View className="flex-1 items-center justify-center bg-background-normal">
        <Text className="text-body-medium text-text-alternative">노트를 찾을 수 없어요.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-normal">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView keyboardShouldPersistTaps="handled">
          <View className="px-5 pt-4">
            <View className="flex-row items-center gap-2">
              {/* TODO(사진): 작성자 프로필 placeholder (시안 42) */}
              <View className="h-10.5 w-10.5 rounded-full bg-background-assistive" />
              <View>
                <View className="flex-row items-center gap-1">
                  <Text className="text-heading-small text-text-normal">{note.authorName}</Text>
                  <View className="rounded-full bg-primary-normal px-2 py-0.5">
                    <Text className="text-caption-small text-text-disable">셀장</Text>
                  </View>
                </View>
                <Text className="text-body-small text-text-alternative">{note.writtenAgo}</Text>
              </View>
            </View>

            <Text className="mt-6 text-heading-medium text-text-normal">
              {note.dateLabel} {note.meetingLabel}
            </Text>

            <View className="mt-6 gap-6">
              {NOTE_QUESTIONS.map((question, index) =>
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
              borderTopColor: colors.background.assistive,
            }}
          >
            <Text className="text-body-main text-text-normal">댓글 {comments.length}</Text>
            {comments.length === 0 ? (
              <CommentEmpty />
            ) : (
              <View className="mt-2">
                {comments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    authorName={comment.authorName}
                    timeAgo={comment.timeAgo}
                    content={comment.content}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        <View
          className="px-5 pt-3"
          style={{
            paddingBottom: insets.bottom + 8,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.background.assistive,
          }}
        >
          <CommentInput
            value={commentDraft}
            onChangeText={setCommentDraft}
            onSubmit={handleCommentSubmit}
            placeholder="답변을 남겨보세요."
          />
        </View>
      </KeyboardAvoidingView>

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
