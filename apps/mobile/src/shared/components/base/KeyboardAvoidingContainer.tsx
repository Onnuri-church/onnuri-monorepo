import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useKeyboardHeight } from "../../hooks/useKeyboardHeight";

interface KeyboardAvoidingContainerProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

// 입력창이 있는 화면의 바깥 틀. 키보드가 올라오면 그 높이만큼 아래를 띄워 입력줄·버튼이 가리지 않게 한다.
// React Native의 KeyboardAvoidingView 대신 쓴다 — edge-to-edge(SDK 57)에서는 그쪽이 높이를 0으로 계산한다
// (이유는 useKeyboardHeight 참고). 화면 전체를 채운다(flex: 1).
// 키보드가 닫혀 있을 때는 기기 하단 안전영역(안드로이드 내비게이션 바)만큼 띄워서, 맨 아래 버튼·입력줄이
// 내비 바에 붙거나 가리지 않게 한다. 키보드가 열리면 그 높이가 내비 바 자리까지 포함하므로 더하지 않는다.
export function KeyboardAvoidingContainer({ children, style }: KeyboardAvoidingContainerProps) {
  const keyboardHeight = useKeyboardHeight();
  const insets = useSafeAreaInsets();
  return (
    <View style={[{ flex: 1 }, style, { paddingBottom: keyboardHeight || insets.bottom }]}>
      {children}
    </View>
  );
}
