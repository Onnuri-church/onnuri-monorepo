import { useEffect, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";

// 알림으로 들어온 댓글을 짚어 주는 효과 (SCRUM-215) — 배경이 연한 초록으로 잠깐 칠해졌다 사라진다.
// 스크롤이 끝날 즈음 보이게 조금 기다렸다가 시작한다.
export function HighlightFlash({ active, children }: { active: boolean; children: ReactNode }) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    if (!active) return;
    opacity.value = withDelay(
      350,
      withSequence(
        withTiming(1, { duration: 250 }),
        withDelay(900, withTiming(0, { duration: 600 })),
      ),
    );
  }, [active, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <View>
      <Animated.View
        pointerEvents="none"
        className="rounded-xl bg-background-alternative"
        style={[StyleSheet.absoluteFill, { marginHorizontal: -8 }, style]}
      />
      {children}
    </View>
  );
}
