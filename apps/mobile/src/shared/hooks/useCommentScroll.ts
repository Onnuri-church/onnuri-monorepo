import { useRef, type RefObject } from "react";
import type { LayoutChangeEvent, ScrollView } from "react-native";

// 알림으로 들어온 댓글까지 스크롤하고 그 댓글을 강조할 id를 돌려준다 (SCRUM-215).
// 댓글 영역(onSectionLayout)과 각 원댓글 덩어리(onThreadLayout)의 위치를 받아, 대상이 든 덩어리의
// 위치가 잡히는 순간 한 번만 스크롤한다. 댓글 영역은 ScrollView 내용의 바로 아래 자식이어야 한다.
export function useCommentScroll(
  scrollRef: RefObject<ScrollView | null>,
  targetId: string | undefined,
  comments: readonly { id: string; replies?: readonly { id: string }[] }[] | undefined,
) {
  const sectionY = useRef<number | null>(null);
  const threadY = useRef(new Map<string, number>());
  const done = useRef(false);
  const threadId = targetId
    ? comments?.find(
        (item) =>
          item.id === targetId || (item.replies ?? []).some((reply) => reply.id === targetId),
      )?.id
    : undefined;

  const tryScroll = () => {
    if (done.current || !threadId || sectionY.current === null) return;
    const y = threadY.current.get(threadId);
    if (y === undefined) return;
    done.current = true;
    scrollRef.current?.scrollTo({ y: Math.max(sectionY.current + y - 120, 0), animated: true });
  };

  return {
    // 댓글이 지워졌거나 차단돼 목록에 없으면 강조하지 않는다.
    highlightId: threadId ? targetId : null,
    onSectionLayout: (event: LayoutChangeEvent) => {
      sectionY.current = event.nativeEvent.layout.y;
      tryScroll();
    },
    onThreadLayout: (id: string) => (event: LayoutChangeEvent) => {
      threadY.current.set(id, event.nativeEvent.layout.y);
      tryScroll();
    },
  };
}
