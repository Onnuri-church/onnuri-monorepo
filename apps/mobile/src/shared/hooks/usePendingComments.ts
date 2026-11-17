import { useState } from "react";

// 보내는 중인 댓글 목록 (SCRUM-215). parentId가 있으면 그 원댓글 아래에 그린다.
export interface PendingComment {
  localId: string;
  content: string;
  parentId: string | null;
}

export function usePendingComments() {
  const [pending, setPending] = useState<PendingComment[]>([]);
  const add = (content: string, parentId: string | null = null) => {
    const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setPending((prev) => [...prev, { localId, content, parentId }]);
    return localId;
  };
  const remove = (localId: string) =>
    setPending((prev) => prev.filter((item) => item.localId !== localId));
  return {
    pending,
    topLevel: pending.filter((item) => item.parentId === null),
    repliesOf: (commentId: string) => pending.filter((item) => item.parentId === commentId),
    add,
    remove,
  };
}

// 서버가 돌려준 새 댓글을 목록에 넣는다 — 원댓글이면 끝에, 답글이면 그 원댓글의 replies 끝에.
export function insertComment<C extends { id: string; replies?: C[] }>(
  comments: C[],
  created: C,
  parentId: string | null,
): C[] {
  const exists = (list: C[]) => list.some((item) => item.id === created.id);
  if (!parentId) return exists(comments) ? comments : [...comments, created];
  return comments.map((item) =>
    item.id === parentId && !exists(item.replies ?? [])
      ? { ...item, replies: [...(item.replies ?? []), created] }
      : item,
  );
}

// 등장 효과 기준용 — 원댓글과 답글 id를 한 줄로 편다.
export function flattenCommentIds(comments: { id: string; replies?: { id: string }[] }[]) {
  return comments.flatMap((item) => [item.id, ...(item.replies ?? []).map((reply) => reply.id)]);
}
