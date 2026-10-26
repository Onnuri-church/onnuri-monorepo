import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
// className은 NativeWind가 Reanimated 컴포넌트에 자동으로 이어준다 — 여기서 cssInterop을 한 번 더
// 걸면 이중 적용돼 flex-1 같은 레이아웃 클래스가 빠진다.

// 눌렀을 때 살짝 작아졌다가 놓으면 스프링으로 튕겨 돌아오는 Pressable.
const PRESS_SPRING = { damping: 18, stiffness: 400, mass: 0.6 };
const RELEASE_SPRING = { damping: 11, stiffness: 320, mass: 0.6 };

interface PressableScaleProps extends Omit<PressableProps, "style"> {
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** 눌렀을 때의 크기 비율. 큰 버튼은 0.97, 작은 아이콘은 0.85처럼 크기에 맞춰 준다. */
  scaleTo?: number;
}

export function PressableScale({
  scaleTo = 0.96,
  onPress,
  onPressIn,
  onPressOut,
  className,
  style,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  // 폰의 "애니메이션 줄이기"가 켜져 있으면 크기 효과를 건너뛴다 (진동은 설정에서 따로 끈다).
  const reducedMotion = useReducedMotion();
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...rest}
      className={className}
      style={[style, animatedStyle]}
      onPressIn={(event) => {
        if (!reducedMotion) scale.value = withSpring(scaleTo, PRESS_SPRING);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        if (!reducedMotion) scale.value = withSpring(1, RELEASE_SPRING);
        onPressOut?.(event);
      }}
      onPress={onPress}
    />
  );
}
