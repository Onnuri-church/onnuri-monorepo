import { useRef, type RefObject } from "react";
import type { LayoutChangeEvent, ScrollView } from "react-native";

// 댓글 위치로 스크롤하는 훅. 두 가지를 한다.
// 1) 알림으로 들어온 댓글까지 스크롤하고 그 댓글을 강조할 id를 돌려준다 (SCRUM-215).
//    댓글 영역(onSectionLayout)과 각 원댓글 덩어리(onThreadLayout)의 위치를 받아, 대상이 든 덩어리의
//    위치가 잡히는 순간 한 번만 스크롤한다. 댓글 영역은 ScrollView 내용의 바로 아래 자식이어야 한다.
// 2) 방금 쓴 댓글이 입력줄 바로 위에 보이게 스크롤한다 (SCRUM-283, scrollToNew) — 메신저에서 보낸
//    말이 입력창 바로 위에 붙는 것과 같다. 안 하면 쓴 댓글이 화면 아래나 키보드 뒤에 있어 등록됐는지
//    알기 어렵다. 답글은 ScrollView의 보이는 높이가 있어야 계산되므로 onScrollLayout을 ScrollView에 건다.
export function useCommentScroll(
  scrollRef: RefObject<ScrollView | null>,
  targetId: string | undefined,
  comments: readonly { id: string; replies?: readonly { id: string }[] }[] | undefined,
) {
  const sectionY = useRef<number | null>(null);
  const sectionHeight = useRef(0);
  const threadY = useRef(new Map<string, number>());
  const threadHeight = useRef(new Map<string, number>());
  const viewportHeight = useRef(0);
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
      sectionHeight.current = event.nativeEvent.layout.height;
      tryScroll();
    },
    onThreadLayout: (id: string) => (event: LayoutChangeEvent) => {
      threadY.current.set(id, event.nativeEvent.layout.y);
      threadHeight.current.set(id, event.nativeEvent.layout.height);
      tryScroll();
    },
    onScrollLayout: (event: LayoutChangeEvent) => {
      viewportHeight.current = event.nativeEvent.layout.height;
    },
    // 방금 쓴 댓글로 스크롤한다. 원댓글(parentId 없음)은 댓글 영역 끝에 붙으므로 영역의 바닥이,
    // 답글은 그 원댓글 덩어리의 바닥이 보이는 영역 바닥에 오게 한다 (댓글 아래에 버튼 등이 더 있는
    // 화면이 있어 맨 끝으로 보내지 않는다). 흐린 댓글이 그려져 높이가 늘어난 뒤여야 해서 잠깐
    // 기다리고, 서버 응답으로 진짜 댓글로 바뀐 뒤 한 번 더 맞춘다.
    scrollToNew: (parentId: string | null) => {
      const run = () => {
        const scroll = scrollRef.current;
        if (!scroll) return;
        if (sectionY.current === null || viewportHeight.current === 0) {
          // 위치를 아직 못 받았으면 원댓글만 맨 끝으로 보낸다.
          if (!parentId) scroll.scrollToEnd({ animated: true });
          return;
        }
        let bottom = sectionY.current + sectionHeight.current;
        if (parentId) {
          const y = threadY.current.get(parentId);
          const height = threadHeight.current.get(parentId);
          if (y === undefined || height === undefined) return;
          bottom = sectionY.current + y + height;
        }
        scroll.scrollTo({ y: Math.max(bottom - viewportHeight.current + 16, 0), animated: true });
      };
      setTimeout(run, 80);
      setTimeout(run, 400);
    },
  };
}
