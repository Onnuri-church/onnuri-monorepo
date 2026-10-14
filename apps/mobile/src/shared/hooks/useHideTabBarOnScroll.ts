import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

import { useTabBarStore } from "../store/useTabBarStore";

// 같은 방향으로 이 만큼 누적돼야 반응한다. 숨김(내림)은 민감하게, 복원(올림)은 둔감하게 —
// 스크롤을 놓는 순간 iOS가 만드는 15~25px짜리 역방향 반동에 탭바가 도로 튀어나오는 걸 막는다
// (실제로 위로 올릴 때는 40px을 금방 넘으므로 체감 지연이 없다).
const HIDE_THRESHOLD = 12;
const SHOW_THRESHOLD = 40;

/**
 * 스크롤 내리면 하단 탭바를 숨기고, 올리면 다시 보이게 하는 핸들러를 만든다.
 *
 * 하단 탭 화면(BottomNav가 보이는 화면)에서 스크롤 컨테이너에 연결해서 쓴다:
 *
 *   const handleScroll = useHideTabBarOnScroll();
 *   <ScrollView onScroll={handleScroll} scrollEventThrottle={16}>  // FlatList도 동일
 *
 * scrollEventThrottle={16}을 같이 줘야 스크롤 중에 이벤트가 계속 온다.
 * 화면을 벗어나면(다른 탭 이동 등) 탭바를 자동으로 복원하므로 정리 코드는 필요 없다.
 * 지금은 마이페이지·전체 셀에만 적용돼 있다 — 다른 탭 화면도 위 두 줄만 붙이면 된다.
 */
export function useHideTabBarOnScroll() {
  const setHidden = useTabBarStore((state) => state.setHidden);
  const lastOffset = useRef(0);
  // 같은 방향으로 이동한 거리의 누적. 방향이 바뀌면 0부터 다시 센다.
  const accumulated = useRef(0);

  // 숨긴 채로 다른 탭에 가면 그 탭에서는 복원할 방법이 없으므로, 화면을 떠날 때 되돌린다.
  useFocusEffect(
    useCallback(() => {
      return () => setHidden(false);
    }, [setHidden]),
  );

  return (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    // 탭바가 오버레이(absolute)라 숨겨도 화면·스크롤 영역 크기가 변하지 않는다 — 그래서
    // 콘텐츠가 짧은 화면(마이페이지)에서도 별도 가드 없이 안전하다. 숨긴 뒤에도 스크롤
    // 여유가 그대로라 위로 올리면(또는 최상단 바운스로) 언제든 복귀한다.
    const maxOffset = Math.max(0, contentSize.height - layoutMeasurement.height);

    // 위·아래 러버밴드(바운스) 구간의 이동은 [0, maxOffset]로 눌러서 없앤다 —
    // 놓는 순간의 역방향 반동이 방향 전환으로 잡혀 탭바가 들썩이는 걸 막는다.
    const offsetY = Math.min(Math.max(contentOffset.y, 0), maxOffset);

    // 최상단에서는 항상 보이게.
    if (offsetY <= 0) {
      lastOffset.current = 0;
      accumulated.current = 0;
      setHidden(false);
      return;
    }

    const diff = offsetY - lastOffset.current;
    lastOffset.current = offsetY;
    if (diff === 0) return;

    // 방향이 바뀌면 누적을 버리고 새 방향부터 다시 센다.
    if (Math.sign(diff) !== Math.sign(accumulated.current)) {
      accumulated.current = 0;
    }
    accumulated.current += diff;

    if (accumulated.current > HIDE_THRESHOLD) {
      setHidden(true);
    } else if (accumulated.current < -SHOW_THRESHOLD) {
      setHidden(false);
    }
  };
}
