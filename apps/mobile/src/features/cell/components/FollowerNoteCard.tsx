import type { FollowerNoteCommentInfo, FollowerNoteInfo } from "@onnuri/shared";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { Avatar } from "../../../shared/components/base/Avatar";
import { Icon } from "../../../shared/components/base/Icon";
import { PressableScale } from "../../../shared/components/base/PressableScale";
import { CommentEmpty } from "../../../shared/components/composed/CommentEmpty";
import { CommentItem } from "../../../shared/components/composed/CommentItem";
import { colors } from "../../../shared/theme/tokens";
import { useThemeColors } from "../../../shared/theme/useThemeColors";
import { toTimeAgo } from "../../../shared/utils/date";
import { getNoteQuestions } from "../followerNotes";
import { NoteNumberBadge } from "./NoteNumberBadge";

interface FollowerNoteCardProps {
  note: FollowerNoteInfo;
  expanded: boolean;
  /** 카드 머리나 댓글 바를 누르면 펼치고 접는다 — 한 번에 하나만 펼치는 건 게시판이 정한다. */
  onToggle: () => void;
  /** 그 셀 셀장·부셀장일 때만 수정/삭제가 보인다. */
  onEditPress?: () => void;
  onDeletePress?: () => void;
  /** 댓글 입력창은 게시판 하단에 하나만 있다 — 카드는 답글·수정 대상만 알린다. */
  onReplyComment: (comment: FollowerNoteCommentInfo) => void;
  onEditComment: (comment: FollowerNoteCommentInfo) => void;
  onDeleteComment: (comment: FollowerNoteCommentInfo) => void;
}

// 팔로워 노트 게시판의 카드 (시안: 상단 날짜 영역 + 회색 댓글 바).
// 상세 화면을 따로 두지 않고, 누르면 그 자리에서 3문항 내용과 댓글이 펼쳐진다 (SCRUM-182).
export function FollowerNoteCard({
  note,
  expanded,
  onToggle,
  onEditPress,
  onDeletePress,
  onReplyComment,
  onEditComment,
  onDeleteComment,
}: FollowerNoteCardProps) {
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const hasPastorComment = note.comments.some((comment) => comment.isPastor);
  const comments = note.comments;

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
    <View>
      <PressableScale
        scaleTo={0.98}
        className="rounded-t-5 border-x border-t border-background-assistive px-5 py-4"
        onPress={onToggle}
      >
        <View className="flex-row items-center gap-2.5">
          <Text className="text-heading-small text-text-normal">{note.dateLabel}</Text>
          <Text className="flex-1 text-body-medium text-text-alternative">{note.meetingLabel}</Text>
          {onEditPress && (
            <View className="flex-row items-center gap-4">
              <PressableScale scaleTo={0.98} className="flex-row items-center gap-0.5" onPress={onEditPress}>
                <Icon name="edit" size={12} color={colors.icon.normal} />
                <Text className="text-caption-main text-text-alternative">{t("수정")}</Text>
              </PressableScale>
              {onDeletePress && (
                <PressableScale scaleTo={0.98} className="flex-row items-center gap-0.5" onPress={onDeletePress}>
                  <Icon name="trash-can" size={12} color={colors.semantic.danger} />
                  <Text className="text-caption-main text-semantic-danger">{t("삭제")}</Text>
                </PressableScale>
              )}
            </View>
          )}
        </View>
        <Text className="mt-1 text-caption-main text-text-neutral">{t("{{name}} 작성", { name: note.authorName })}</Text>

        {expanded && (
          <View className="mt-5 gap-6">
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
        )}
      </PressableScale>

      <PressableScale
        scaleTo={0.98}
        className={`flex-row items-center justify-between bg-background-muted px-5 py-3.5 ${
          expanded ? "" : "rounded-b-5"
        }`}
        onPress={onToggle}
      >
        <View className="flex-row items-center gap-1">
          <Icon
            name="comment-light"
            size={24}
            color={hasPastorComment ? themeColors.primary.normal : themeColors.text.alternative}
          />
          <Text
            className={
              hasPastorComment
                ? "text-caption-main text-primary-normal"
                : "text-caption-main text-text-alternative"
            }
          >
            {hasPastorComment
              ? t("목사님 댓글")
              : comments.length > 0
                ? t("댓글 {{count}}", { count: comments.length })
                : t("아직 댓글이 없어요")}
          </Text>
        </View>
        <View style={expanded ? { transform: [{ rotate: "180deg" }] } : undefined}>
          <Icon
            name="arrow-drop-down"
            size={14}
            color={hasPastorComment ? themeColors.primary.normal : themeColors.icon.normal}
          />
        </View>
      </PressableScale>

      {expanded && (
        <View className="rounded-b-5 border-x border-b border-background-assistive px-4 pb-4 pt-2">
          {comments.length === 0 ? (
            <CommentEmpty />
          ) : (
            // 대댓글은 시간순 목록에서 부모 바로 밑으로 모아 한 단계 들여쓴다 — 순서대로만 그리면
            // 그 사이에 달린 다른 댓글 밑에 붙어 보인다.
            comments
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
              ))
          )}
        </View>
      )}
    </View>
  );
}
