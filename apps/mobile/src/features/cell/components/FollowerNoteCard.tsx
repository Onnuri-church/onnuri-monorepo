import type { FollowerNoteInfo } from "@onnuri/shared";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Icon } from "../../../shared/components/base/Icon";
import { CommentInput } from "../../../shared/components/composed/CommentInput";
import { CommentItem } from "../../../shared/components/composed/CommentItem";
import { colors } from "../../../shared/theme/tokens";

interface FollowerNoteCardProps {
  note: FollowerNoteInfo;
  onPress: () => void;
  /** 내 글(셀장 본인)일 때만 수정/삭제가 보인다. */
  onEditPress?: () => void;
  onDeletePress?: () => void;
  /** 펼친 댓글 영역의 입력창 등록 — 게시판 화면의 댓글 mutation이 꽂힌다. */
  onCommentSubmit: (content: string) => void;
}

// 팔로워 노트 게시판의 카드 (시안: 상단 날짜 영역 + 회색 댓글 바, 바를 누르면 댓글이 아래로 펼쳐진다).
export function FollowerNoteCard({
  note,
  onPress,
  onEditPress,
  onDeletePress,
  onCommentSubmit,
}: FollowerNoteCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");

  const hasPastorComment = note.comments.some((comment) => comment.isPastor);

  const handleCommentSubmit = () => {
    const content = commentDraft.trim();
    if (!content) return;
    onCommentSubmit(content);
    setCommentDraft("");
  };

  return (
    <View>
      <Pressable
        className="rounded-t-5 border-x border-t border-background-assistive px-5 py-4"
        onPress={onPress}
      >
        <View className="flex-row items-center gap-2.5">
          <Text className="text-heading-small text-text-normal">{note.dateLabel}</Text>
          <Text className="flex-1 text-body-medium text-text-alternative">{note.meetingLabel}</Text>
          {onEditPress && (
            <View className="flex-row items-center gap-4">
              <Pressable className="flex-row items-center gap-0.5" onPress={onEditPress}>
                <Icon name="edit" size={12} color={colors.icon.normal} />
                <Text className="text-caption-main text-text-alternative">수정</Text>
              </Pressable>
              {onDeletePress && (
                <Pressable className="flex-row items-center gap-0.5" onPress={onDeletePress}>
                  <Icon name="trash-can" size={12} color={colors.semantic.danger} />
                  <Text className="text-caption-main text-semantic-danger">삭제</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
        <Text className="mt-1 text-caption-main text-text-neutral">{note.authorName} 작성</Text>
      </Pressable>

      <Pressable
        className={`flex-row items-center justify-between bg-background-muted px-5 py-3.5 ${
          expanded ? "" : "rounded-b-5"
        }`}
        onPress={() => setExpanded((prev) => !prev)}
      >
        <View className="flex-row items-center gap-1">
          <Icon
            name="comment-light"
            size={24}
            color={hasPastorComment ? colors.primary.normal : colors.text.alternative}
          />
          <Text
            className={
              hasPastorComment
                ? "text-caption-main text-primary-normal"
                : "text-caption-main text-text-alternative"
            }
          >
            {hasPastorComment
              ? "목사님 댓글"
              : note.comments.length > 0
                ? `댓글 ${note.comments.length}`
                : "아직 댓글이 없어요"}
          </Text>
        </View>
        <Icon
          name="arrow-drop-down"
          size={14}
          color={hasPastorComment ? colors.primary.normal : colors.icon.normal}
        />
      </Pressable>

      {expanded && (
        <View className="gap-5 rounded-b-5 border-x border-b border-background-assistive px-4 py-5">
          {note.comments.map((comment) => (
            // 대댓글(parentId 있음)은 시안처럼 한 단계 들여쓴다.
            <View key={comment.id} className={comment.parentId ? "pl-10" : ""}>
              <CommentItem
                authorName={comment.authorName}
                timeAgo={comment.dateLabel}
                content={comment.content}
              />
            </View>
          ))}
          <CommentInput
            value={commentDraft}
            onChangeText={setCommentDraft}
            onSubmit={handleCommentSubmit}
            placeholder="답변을 남겨보세요."
          />
        </View>
      )}
    </View>
  );
}
