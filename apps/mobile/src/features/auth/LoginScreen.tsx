import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Logo } from "../../shared/components/base/Logo";
import { useAuthStore } from "../../shared/store/useAuthStore";
import type { AuthStackParamList } from "../../shared/types/navigation";
import { SocialLoginButton } from "./components/SocialLoginButton";

// 시안은 402×874 고정 프레임의 절대 좌표지만 실기기 높이는 제각각이라, 로고 블록이 남는 공간을
// 차지하고(flex-1) 버튼 그룹은 아래에 붙는 구조로 옮겼다 — 화면이 작아지면 여백부터 줄어든다.
export function LoginScreen() {
  const startGuestSession = useAuthStore((state) => state.startGuestSession);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  // 카카오·구글 로그인 API가 아직 없어서(백엔드에 소셜 로그인 엔드포인트 미구현) 두 버튼은
  // 프로필 설정 화면으로 바로 넘어간다. 실제로는 로그인 응답에 따라 프로필 설정/홈으로 갈린다 —
  // 연동할 때 이 함수를 그 분기로 바꾼다. 세션은 프로필 설정 화면의 등록하기에서 만든다.
  const handleSocialLogin = () => navigation.navigate("ProfileSetup");

  return (
    <View
      className="flex-1 bg-background-normal"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      {/* 배경이 흰색이라 상태바 글자·아이콘은 어둡게 (스플래시는 light) */}
      <StatusBar style="dark" />

      {/* safe area는 위 View가 style로, 시안 여백은 여기서 클래스로 — 두 값을 한 곳에 섞지 않는다 */}
      <View className="flex-1 px-11 pb-12">
        <View className="flex-1 items-center justify-center">
          <Logo variant="symbol" />
          <Text className="text-body-medium text-text-neutral">2026 온누리교회 청년부</Text>
          {/* 타이틀 SVG가 글자에 딱 맞게 잘려 있어서 시안의 행간 여백이 없다 — 8px로 대신한다 */}
          <View className="mt-2">
            <Logo variant="wordmark" />
          </View>
        </View>

        <View className="gap-4">
          <SocialLoginButton provider="kakao" onPress={handleSocialLogin} />
          <SocialLoginButton provider="google" onPress={handleSocialLogin} />
        </View>

        <Pressable
          className="mt-4 items-center py-3"
          onPress={startGuestSession}
          style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
        >
          <Text className="text-body-medium text-text-alternative">게스트로 로그인하기</Text>
        </Pressable>
      </View>
    </View>
  );
}
