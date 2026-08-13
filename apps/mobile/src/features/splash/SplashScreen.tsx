import { StatusBar } from "expo-status-bar";
import { View } from "react-native";

import { Logo } from "../../shared/components/base/Logo";

// 네이티브 스플래시(배경색만 그린다)에서 이어지는 화면이라 배경이 화면 전체를 덮어야 한다.
// SafeAreaView로 감싸면 노치·홈 인디케이터 영역에 흰 띠가 생겨서 전환이 눈에 띈다 — 감싸지 않는다.
// pb-17(68px)은 로고를 정중앙에서 34px 위로 올리기 위한 값이다 (tokens.js의 spacing 참고).
export function SplashScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-primary-normal pb-17">
      {/* 진초록 배경이라 상태바를 밝게. style="light"는 배경이 아니라 글자·아이콘 색을 뜻한다. */}
      <StatusBar style="light" />
      <Logo />
    </View>
  );
}
