import { useEffect, useState } from "react";
import { Dimensions, Keyboard, Platform } from "react-native";

// 키보드가 가린 높이. 키보드가 닫혀 있으면 0.
// KeyboardAvoidingView를 쓰지 않는 이유: SDK 57은 edge-to-edge가 항상 켜져 있어 창이 키보드만큼
// 줄어들지 않는다(매니페스트의 adjustResize가 무력화된다). 창 크기로 키보드를 역산하는
// KeyboardAvoidingView는 이 상태에서 올려야 할 높이를 0으로 계산해 입력줄이 키보드에 가린다.
export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    // iOS는 애니메이션 시작에 맞춰 올려야 따라 붙는다. Android에는 will* 이벤트가 없다.
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (event) => {
      // event.endCoordinates.height는 키보드 자체 높이라 하단 내비게이션 바(약 48dp) 자리가 빠진다 —
      // 화면은 그 아래까지 그려지므로, 키보드 윗변(screenY)부터 화면 끝까지를 가린 높이로 쓴다.
      // 안 그러면 입력줄이 키보드 윗부분에 그만큼 가린다 (실기기에서 확인).
      const coveredHeight = Dimensions.get("screen").height - event.endCoordinates.screenY;
      setKeyboardHeight(Math.max(event.endCoordinates.height, coveredHeight));
    });
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return keyboardHeight;
}
