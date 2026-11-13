import type { PostComment } from "@onnuri/shared";
import { View } from "react-native";

import { CommentItem } from "../../../shared/components/composed/CommentItem";
import { toTimeAgo } from "../../../shared/utils/date";

interface CommentThreadProps {
  comment: PostComment;
  onReplyPress: (comment: PostComment) => void;
  onEditPress: (comment: PostComment) => void;
  onDeletePress: (comment: PostComment) => void;
  /** 남의 댓글에 "차단" 버튼 — 게스트면 넘기지 않는다 (SCRUM-198) */
  onBlockPress?: (comment: PostComment) => void;
}

// 댓글 한 덩어리 = 최상위 댓글 + 그 대댓글들. 깊이가 1단계뿐이라 재귀로 만들지 않는다.
// 대댓글은 왼쪽 세로선과 들여쓰기로 부모에 묶인 걸 보여준다 (시안).
export function CommentThread({
  comment,
  onReplyPress,
  onEditPress,
  onDeletePress,
  onBlockPress,
}: CommentThreadProps) {
  const blockHandler = (target: PostComment) =>
    onBlockPress && !target.isMine ? () => onBlockPress(target) : undefined;
  return (
    <View>
      <CommentItem
        authorName={comment.authorName}
        avatarUrl={comment.authorAvatarUrl}
        timeAgo={toTimeAgo(comment.createdAt)}
        content={comment.content}
        onReplyPress={() => onReplyPress(comment)}
        onEditPress={comment.canEdit ? () => onEditPress(comment) : undefined}
        onDeletePress={comment.canDelete ? () => onDeletePress(comment) : undefined}
        onBlockPress={blockHandler(comment)}
      />
      {comment.replies.map((reply) => (
        <View
          key={reply.id}
          className="ml-4 border-l border-text-assistive pl-4"
        >
          {/* 대댓글에는 답글 버튼을 주지 않는다 — 깊이가 1단계까지라 서버가 400을 준다. */}
          <CommentItem
            authorName={reply.authorName}
            avatarUrl={reply.authorAvatarUrl}
            timeAgo={toTimeAgo(reply.createdAt)}
            content={reply.content}
            onEditPress={reply.canEdit ? () => onEditPress(reply) : undefined}
            onDeletePress={reply.canDelete ? () => onDeletePress(reply) : undefined}
            onBlockPress={blockHandler(reply)}
          />
        </View>
      ))}
    </View>
  );
}
