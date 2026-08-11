import { useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

interface SkeletonProps {
  className?: string;
}

// 로딩 상태 placeholder. 색은 컬러 규칙대로 semantic 토큰만 사용, 사이즈는 호출부에서
// className으로 Tailwind 기본 스케일에 맞게 지정한다 (예: className="h-4 w-32 rounded").
export function Skeleton({ className }: SkeletonProps) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View className={`bg-text-assistive ${className ?? ""}`} style={animatedStyle} />;
}
