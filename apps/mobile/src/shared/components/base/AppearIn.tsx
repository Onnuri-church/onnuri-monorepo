import type { ReactNode } from "react";
import Animated, { Keyframe } from "react-native-reanimated";

// 새로 생긴 항목이 "툭" 나타나지 않게 0.2초 동안 들어오게 한다 (SCRUM-215).
// - rise: 아래에서 살짝 올라오며 나타남 — 댓글
// - pop: 살짝 커지며 나타남 — 채팅 말풍선
// 화면을 처음 열 때 이미 있던 항목은 animate=false로 넘겨 그대로 그린다 — 다 같이 튀어나오면 정신없다.
// 시스템 "동작 줄이기"가 켜져 있으면 Reanimated가 알아서 애니메이션을 건너뛴다 (ReduceMotion.System 기본값).
const rise = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 8 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }] },
}).duration(200);

const pop = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.95 }] },
  100: { opacity: 1, transform: [{ scale: 1 }] },
}).duration(180);

export function AppearIn({
  animate,
  variant = "rise",
  children,
}: {
  animate: boolean;
  variant?: "rise" | "pop";
  children: ReactNode;
}) {
  return (
    <Animated.View entering={animate ? (variant === "pop" ? pop : rise) : undefined}>
      {children}
    </Animated.View>
  );
}
