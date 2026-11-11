import { useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

interface SkeletonProps {
  className?: string;
}

// 응답이 이보다 빨리 오면 회색 블록을 아예 보여주지 않는다 (SCRUM-186) — 금방 끝나는 로딩에서
// 블록이 잠깐 깜빡였다 사라지면 오히려 화면이 튀어 보인다. 자리는 처음부터 차지해 레이아웃은 그대로다.
const SHOW_DELAY_MS = 300;

// 로딩 상태 placeholder. 색은 컬러 규칙대로 semantic 토큰만 사용, 사이즈는 호출부에서
// className으로 Tailwind 기본 스케일에 맞게 지정한다 (예: className="h-4 w-32 rounded").
// 처음 0.3초는 투명하게 자리만 잡고, 그 뒤에 나타나 깜빡이는 애니메이션을 시작한다.
export function Skeleton({ className }: SkeletonProps) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      SHOW_DELAY_MS,
      withSequence(
        withTiming(0.5, { duration: 150 }),
        withRepeat(withTiming(1, { duration: 700 }), -1, true),
      ),
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View className={`bg-text-assistive ${className ?? ""}`} style={animatedStyle} />;
}
