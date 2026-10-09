import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

import { useKeyboardHeight } from "../../hooks/useKeyboardHeight";

interface KeyboardAvoidingContainerProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

// 입력창이 있는 화면의 바깥 틀. 키보드가 올라오면 그 높이만큼 아래를 띄워 입력줄·버튼이 가리지 않게 한다.
// React Native의 KeyboardAvoidingView 대신 쓴다 — edge-to-edge(SDK 57)에서는 그쪽이 높이를 0으로 계산한다
// (이유는 useKeyboardHeight 참고). 화면 전체를 채운다(flex: 1).
export function KeyboardAvoidingContainer({ children, style }: KeyboardAvoidingContainerProps) {
  const keyboardHeight = useKeyboardHeight();
  return <View style={[{ flex: 1 }, style, { paddingBottom: keyboardHeight }]}>{children}</View>;
}
