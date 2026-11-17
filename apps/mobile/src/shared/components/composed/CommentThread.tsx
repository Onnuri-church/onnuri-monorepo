import { View } from "react-native";

import { AppearIn } from "../base/AppearIn";
import { useAuthStore } from "../../store/useAuthStore";
import { toTimeAgo } from "../../utils/date";
import { useTranslation } from "react-i18next";
import { CommentItem } from "./CommentItem";
import { HighlightFlash } from "./HighlightFlash";
import type { PendingComment } from "../../hooks/usePendingComments";

// 게시판마다 댓글 타입 이름은 달라도 모양은 같다 — 스레드가 쓰는 부분만 요구한다.
export interface ThreadComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  createdAt: string;
  content: string;
  isMine: boolean;
  /** 없으면 작성자 본인만 (isMine) */
  canEdit?: boolean;
  canDelete?: boolean;
  replies?: ThreadComment[];
}

interface CommentThreadProps<C extends ThreadComment> {
  comment: C;
  /** 주면 원댓글에 "답글" 버튼이 붙는다. 답글에는 붙지 않는다 — 깊이가 1단계까지라 서버가 400을 준다. */
  onReplyPress?: (comment: C) => void;
  /** 주면 수정 권한(canEdit)이 있는 댓글에 "수정" 버튼이 붙는다 */
  onEditPress?: (comment: C) => void;
  onDeletePress?: (comment: C) => void;
  /** 남의 댓글에 "차단" — 게스트면 넘기지 않는다 (SCRUM-198) */
  onBlockPress?: (comment: C) => void;
  /** 남의 댓글에 "신고" — 게스트면 넘기지 않는다 (SCRUM-199) */
  onReportPress?: (comment: C) => void;
  /** 화면을 연 뒤 새로 생긴 댓글인지 — 등장 효과를 준다 (SCRUM-215) */
  isNew?: (id: string) => boolean;
  /** 이 원댓글에 보내는 중인 답글 */
  pendingReplies?: PendingComment[];
  /** 알림으로 들어온 댓글 — 잠깐 강조한다 */
  highlightId?: string | null;
}

// 댓글 한 덩어리 = 원댓글 + 그 답글들 (SCRUM-216 — 게시판 공용).
// 답글은 왼쪽 세로선과 들여쓰기로 원댓글에 묶인 걸 보여준다 (부서활동 시안).
export function CommentThread<C extends ThreadComment>({
  comment,
  onReplyPress,
  onEditPress,
  onDeletePress,
  onBlockPress,
  onReportPress,
  isNew,
  pendingReplies = [],
  highlightId,
}: CommentThreadProps<C>) {
  const handlers = (target: C) => ({
    onEditPress:
      onEditPress && (target.canEdit ?? target.isMine) ? () => onEditPress(target) : undefined,
    onDeletePress:
      onDeletePress && (target.canDelete ?? target.isMine)
        ? () => onDeletePress(target)
        : undefined,
    onBlockPress: onBlockPress && !target.isMine ? () => onBlockPress(target) : undefined,
    onReportPress: onReportPress && !target.isMine ? () => onReportPress(target) : undefined,
  });
  const replies = (comment.replies ?? []) as C[];
  return (
    <AppearIn animate={isNew?.(comment.id) ?? false}>
      <HighlightFlash active={highlightId === comment.id}>
        <CommentItem
          authorName={comment.authorName}
          avatarUrl={comment.authorAvatarUrl}
          timeAgo={toTimeAgo(comment.createdAt)}
          content={comment.content}
          onReplyPress={onReplyPress ? () => onReplyPress(comment) : undefined}
          {...handlers(comment)}
        />
      </HighlightFlash>
      {replies.map((reply) => (
        <AppearIn key={reply.id} animate={isNew?.(reply.id) ?? false}>
          <View className="ml-4 border-l border-text-assistive pl-4">
            <HighlightFlash active={highlightId === reply.id}>
              <CommentItem
                authorName={reply.authorName}
                avatarUrl={reply.authorAvatarUrl}
                timeAgo={toTimeAgo(reply.createdAt)}
                content={reply.content}
                {...handlers(reply)}
              />
            </HighlightFlash>
          </View>
        </AppearIn>
      ))}
      {pendingReplies.map((item) => (
        <View key={item.localId} className="ml-4 border-l border-text-assistive pl-4">
          <PendingCommentItem content={item.content} />
        </View>
      ))}
    </AppearIn>
  );
}

// 보내는 중인 댓글 — 내 이름·사진으로 흐리게 먼저 그린다. 서버가 받으면 진짜 댓글로 바뀐다 (SCRUM-215).
export function PendingCommentItem({ content }: { content: string }) {
  const { t } = useTranslation();
  const me = useAuthStore((state) =>
    state.session.status === "authenticated" ? state.session.user : null,
  );
  return (
    <AppearIn animate>
      <View style={{ opacity: 0.5 }}>
        <CommentItem
          authorName={me?.name ?? ""}
          avatarUrl={me?.avatarUrl ?? null}
          timeAgo={t("보내는 중")}
          content={content}
        />
      </View>
    </AppearIn>
  );
}
