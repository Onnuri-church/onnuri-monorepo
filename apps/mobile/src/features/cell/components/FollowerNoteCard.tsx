import type { FollowerNoteCommentInfo, FollowerNoteInfo } from "@onnuri/shared";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar } from "../../../shared/components/base/Avatar";
import { Icon } from "../../../shared/components/base/Icon";
import { PressableScale } from "../../../shared/components/base/PressableScale";
import { CommentEmpty } from "../../../shared/components/composed/CommentEmpty";
import { CommentInput } from "../../../shared/components/composed/CommentInput";
import { CommentItem } from "../../../shared/components/composed/CommentItem";
import { colors } from "../../../shared/theme/tokens";
import { useThemeColors } from "../../../shared/theme/useThemeColors";
import { toTimeAgo } from "../../../shared/utils/date";
import { getNoteQuestions } from "../followerNotes";
import { NoteNumberBadge } from "./NoteNumberBadge";

export interface MenuAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FollowerNoteCardProps {
  note: FollowerNoteInfo;
  expanded: boolean;
  /** 카드 머리를 누르면 펼치고 접는다 — 한 번에 하나만 펼치는 건 게시판이 정한다. */
  onToggle: () => void;
  /** 수정·삭제 메뉴(⋮) — 그 셀 셀장·부셀장에게만, 펼쳤을 때만 보인다. 버튼 화면 좌표를 넘긴다. */
  onMenuPress?: (anchor: MenuAnchor) => void;
  onReplyComment: (comment: FollowerNoteCommentInfo) => void;
  onEditComment: (comment: FollowerNoteCommentInfo) => void;
  onDeleteComment: (comment: FollowerNoteCommentInfo) => void;
  /** 댓글 입력 상태는 게시판이 들고 있다 (펼친 카드 하나에만 입력창이 있다). */
  draft: string;
  onDraftChange: (text: string) => void;
  onSubmitComment: () => void;
  replyTo: FollowerNoteCommentInfo | null;
  editing: FollowerNoteCommentInfo | null;
  onCancelComposerMode: () => void;
  onComposerFocus: () => void;
}

// 팔로워 노트 게시판의 카드. 접혀 있을 땐 날짜·작성자만 깔끔하게, 머리를 누르면 그 자리에서
// 3문항 내용 → 댓글 → 댓글 입력창이 카드 안에 펼쳐진다 (상세 화면 없음 — SCRUM-182).
export function FollowerNoteCard({
  note,
  expanded,
  onToggle,
  onMenuPress,
  onReplyComment,
  onEditComment,
  onDeleteComment,
  draft,
  onDraftChange,
  onSubmitComment,
  replyTo,
  editing,
  onCancelComposerMode,
  onComposerFocus,
}: FollowerNoteCardProps) {
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const comments = note.comments;
  const menuButtonRef = useRef<View>(null);

  const handleMenuPress = () => {
    menuButtonRef.current?.measureInWindow((x, y, width, height) =>
      onMenuPress?.({ x, y, width, height }),
    );
  };

  const renderComment = (comment: FollowerNoteCommentInfo) => (
    <CommentItem
      authorName={comment.authorName}
      timeAgo={comment.dateLabel}
      content={comment.content}
      // 답글은 원댓글에만 단다 — 깊이가 1단계까지라 서버가 400을 준다.
      onReplyPress={comment.parentId ? undefined : () => onReplyComment(comment)}
      onEditPress={comment.canEdit ? () => onEditComment(comment) : undefined}
      onDeletePress={comment.canDelete ? () => onDeleteComment(comment) : undefined}
    />
  );

  return (
    <View className="rounded-5 border border-background-assistive">
      <PressableScale scaleTo={0.98} className="px-5 py-4" onPress={onToggle}>
        <View className="flex-row items-center gap-2.5">
          <Text className="text-heading-small text-text-normal">{note.dateLabel}</Text>
          <Text className="flex-1 text-body-medium text-text-alternative">{note.meetingLabel}</Text>
          {expanded && onMenuPress && (
            <Pressable ref={menuButtonRef} onPress={handleMenuPress} hitSlop={10}>
              <Icon name="more" size={24} color={colors.icon.normal} />
            </Pressable>
          )}
          <View style={{ transform: [{ rotate: expanded ? "-90deg" : "90deg" }] }}>
            <Icon name="expand-right" size={20} color={themeColors.icon.normal} />
          </View>
        </View>
        <Text className="mt-1 text-caption-main text-text-neutral">
          {t("{{name}} 작성", { name: note.authorName })}
        </Text>
      </PressableScale>

      {expanded && (
        <View className="px-5 pb-5">
          <View className="gap-6">
            <View className="flex-row items-center gap-2">
              <Avatar imageUrl={note.authorAvatarUrl} size={32} />
              <Text className="text-body-small text-text-alternative">
                {note.writtenDateLabel} · {toTimeAgo(note.createdAt)}
              </Text>
            </View>
            {getNoteQuestions(note.formVersion).map((question, index) =>
              note.answers[index]?.trim() ? (
                <View key={question.title} className="gap-2.5">
                  <View className="flex-row items-center gap-1">
                    <NoteNumberBadge number={index + 1} />
                    <Text className="text-body-main text-text-normal">{question.title}</Text>
                  </View>
                  <Text className="text-body-medium text-text-neutral">{note.answers[index]}</Text>
                </View>
              ) : null,
            )}
          </View>

          <View
            className="mt-6 pt-4"
            style={{
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: themeColors.background.assistive,
            }}
          >
            <Text className="text-body-main text-text-normal">
              {t("댓글 {{count}}", { count: comments.length })}
            </Text>
            {comments.length === 0 ? (
              <CommentEmpty />
            ) : (
              <View className="mt-2">
                {/* 대댓글은 시간순 목록에서 부모 바로 밑으로 모아 한 단계 들여쓴다. */}
                {comments
                  .filter((comment) => !comment.parentId)
                  .map((comment) => (
                    <View key={comment.id}>
                      {renderComment(comment)}
                      {comments
                        .filter((reply) => reply.parentId === comment.id)
                        .map((reply) => (
                          <View key={reply.id} className="pl-10">
                            {renderComment(reply)}
                          </View>
                        ))}
                    </View>
                  ))}
              </View>
            )}

            <View className="mt-4">
              {/* 수정·답글 중일 때만 무엇을 하는 중인지 보여주고 빠져나갈 길을 준다. */}
              {(editing || replyTo) && (
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-body-small text-text-alternative">
                    {editing
                      ? t("댓글 수정 중")
                      : t("{{name}}님에게 답글", { name: replyTo?.authorName ?? "" })}
                  </Text>
                  <Pressable onPress={onCancelComposerMode} hitSlop={8}>
                    <Text className="text-body-small text-text-alternative">{t("취소")}</Text>
                  </Pressable>
                </View>
              )}
              <CommentInput
                value={draft}
                onChangeText={onDraftChange}
                onSubmit={onSubmitComment}
                onFocus={onComposerFocus}
                placeholder={replyTo ? t("답글을 입력하세요") : t("답변을 남겨보세요.")}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
