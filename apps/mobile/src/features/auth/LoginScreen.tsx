import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { signInWithDev } from "../../shared/api/session";
import { Logo } from "../../shared/components/base/Logo";
import { useAuthStore } from "../../shared/store/useAuthStore";
import { SocialLoginButton } from "./components/SocialLoginButton";
import { loginWithGoogleSdk, loginWithKakaoSdk } from "./socialLogin";

// 개발용 로그인이 만드는 역할별 고정 계정. 소셜 SDK가 없는 웹/Expo Go에서 유저 기반 기능을
// 확인하기 위한 것. 역할(관리자 플래그·멤버십)이 유저 레코드에 계속 남으므로, 한 계정으로 role만
// 바꿔 로그인하면 역할이 누적된다 — 역할마다 계정을 분리해서 "일반 유저" 상태를 보존한다.
const DEV_ACCOUNTS = [
  { label: "일반", email: "dev@onnuri.local", role: "MEMBER" },
  { label: "팀장", email: "dev-team-leader@onnuri.local", role: "TEAM_LEADER" },
  { label: "셀장", email: "dev-cell-leader@onnuri.local", role: "CELL_LEADER" },
  { label: "관리자", email: "dev-admin@onnuri.local", role: "ADMIN" },
] as const;

// 개발용 로그인 버튼은 .env에 EXPO_PUBLIC_AUTH_DEV_LOGIN=true를 명시한 사람에게만 보인다
// (백엔드 AUTH_DEV_LOGIN과 짝 — 둘 다 켜야 실제로 동작한다). Expo는 EXPO_PUBLIC_ 접두사 변수만
// 번들에 넣고 빌드 시점에 상수로 치환하므로, .env를 바꾸면 Metro를 다시 시작해야 반영된다.
const DEV_LOGIN_ENABLED = process.env.EXPO_PUBLIC_AUTH_DEV_LOGIN === "true";

// 시안은 402×874 고정 프레임의 절대 좌표지만 실기기 높이는 제각각이라, 로고 블록이 남는 공간을
// 차지하고(flex-1) 버튼 그룹은 아래에 붙는 구조로 옮겼다 — 화면이 작아지면 여백부터 줄어든다.
export function LoginScreen() {
  const startGuestSession = useAuthStore((state) => state.startGuestSession);
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);

  // 성공하면 signInWithSocial이 세션을 만들고, RootNavigator가 session.status를 보고 홈으로 전환한다.
  // TODO(프로필 등록 API 작업에서): isNewUser=true면 프로필 설정으로 보내야 하는데, ProfileSetup이
  // AuthStack에만 있어 세션이 생기는 순간 접근 불가다 — 분기는 프로필 저장 API와 함께 설계한다.
  const runSocialLogin = async (
    login: () => Promise<{ isNewUser: boolean } | null>,
  ) => {
    if (submitting) return; // 연타로 로그인 창이 겹치지 않게
    setSubmitting(true);
    try {
      await login(); // null이면 사용자가 취소한 것 — 아무것도 하지 않는다
    } catch (error) {
      // 흔한 원인: dev build가 아님(네이티브 모듈 없음), .env 키 미설정, 빌드 키(SHA-1/키 해시) 미등록.
      Alert.alert(
        "로그인에 실패했습니다",
        error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleKakaoPress = () => void runSocialLogin(loginWithKakaoSdk);
  const handleGooglePress = () => void runSocialLogin(loginWithGoogleSdk);
  const handleDevPress = (account: (typeof DEV_ACCOUNTS)[number]) =>
    void runSocialLogin(() => signInWithDev(account.email, account.role));

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
          <SocialLoginButton provider="kakao" onPress={handleKakaoPress} />
          <SocialLoginButton provider="google" onPress={handleGooglePress} />
        </View>

        <Pressable
          className="mt-4 items-center py-3"
          onPress={startGuestSession}
          style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
        >
          <Text className="text-body-medium text-text-alternative">게스트로 로그인하기</Text>
        </Pressable>

        {/* EXPO_PUBLIC_AUTH_DEV_LOGIN=true일 때만 — 소셜 SDK 없이 역할별 고정 계정의 진짜 세션으로 유저 기능을 확인하는 버튼 */}
        {DEV_LOGIN_ENABLED && (
          <View className="flex-row items-center justify-center gap-3 py-2">
            <Text className="text-body-medium text-text-assistive">[DEV]</Text>
            {DEV_ACCOUNTS.map((account) => (
              <Pressable
                key={account.role}
                onPress={() => handleDevPress(account)}
                style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
              >
                <Text className="text-body-medium text-text-assistive">{account.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
