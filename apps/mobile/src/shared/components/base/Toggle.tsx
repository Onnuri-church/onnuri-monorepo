import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { PressableScale } from "./PressableScale";

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

// 노브가 움직이는 거리 = 트랙 안쪽 폭(35 - 패딩 1×2) - 노브 20.
const KNOB_TRAVEL = 13;
const KNOB_SPRING = { damping: 14, stiffness: 260, mass: 0.7 };

// iOS 스타일 토글 (시안 확정값: 트랙 35×22 radius 16, 노브 20 원형).
// RN 기본 Switch는 51×31로 고정이라 시안 크기를 맞출 수 없어 직접 그린다.
// 시안에는 켜짐 상태만 있다 — 꺼짐 트랙 색(background.muted)은 임시값이라 확인 필요.
// 노브 그림자(0 3 7 12%)는 등록된 그림자 토큰에 없어 생략 — 필요해지면 토큰 추가 후 적용.
// 노브는 스프링으로 미끄러지고 누를 때 가벼운 진동이 난다 (애니메이션 줄이기 설정이면 즉시 이동).
export function Toggle({ value, onValueChange }: ToggleProps) {
  const reducedMotion = useReducedMotion();
  const offset = useSharedValue(value ? KNOB_TRAVEL : 0);

  useEffect(() => {
    const target = value ? KNOB_TRAVEL : 0;
    offset.value = reducedMotion ? target : withSpring(target, KNOB_SPRING);
  }, [value, reducedMotion, offset]);

  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));

  return (
    <PressableScale
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      scaleTo={0.94}
      haptic
      className={`h-5.5 w-8.75 items-start justify-center rounded-2xl p-px ${
        value ? "bg-primary-normal" : "bg-background-muted"
      }`}
    >
      <Animated.View style={knobStyle}>
        <View className="h-5 w-5 rounded-full bg-background-normal" />
      </Animated.View>
    </PressableScale>
  );
}
