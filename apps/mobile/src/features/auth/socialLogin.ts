import { signInWithSocial } from "../../shared/api/session";

// 카카오/구글 SDK로 제공자 토큰을 받아 백엔드 로그인(signInWithSocial)까지 잇는다.
// 두 SDK 다 네이티브 모듈이라 dev build에서만 동작한다 — Expo Go·웹에서는 모듈 로드 자체가
// 실패할 수 있어 버튼을 누르는 시점에 lazy import하고, 실패는 호출부가 알림으로 안내한다.
// 반환값 null은 사용자가 로그인 창을 닫은 것(취소)이다 — 에러가 아니다.

const KAKAO_NATIVE_APP_KEY = process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

let kakaoInitialized = false;
let googleConfigured = false;

export async function loginWithKakaoSdk(): Promise<{ isNewUser: boolean } | null> {
  if (!KAKAO_NATIVE_APP_KEY) {
    throw new Error(
      "EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY가 비어 있습니다. 값은 Jira 문서 참고 (.env.example).",
    );
  }

  const { initializeKakaoSDK } = await import("@react-native-kakao/core");
  const { login } = await import("@react-native-kakao/user");

  if (!kakaoInitialized) {
    initializeKakaoSDK(KAKAO_NATIVE_APP_KEY);
    kakaoInitialized = true;
  }

  let kakaoToken: { accessToken: string };
  try {
    kakaoToken = await login();
  } catch (error) {
    if (isCancelError(error)) return null;
    throw error;
  }
  return signInWithSocial("kakao", kakaoToken.accessToken);
}

export async function loginWithGoogleSdk(): Promise<{ isNewUser: boolean } | null> {
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error(
      "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID가 비어 있습니다. 값은 Jira 문서 참고 (.env.example).",
    );
  }

  const { GoogleSignin } = await import("@react-native-google-signin/google-signin");

  if (!googleConfigured) {
    // ID 토큰의 aud가 이 웹 클라이언트 ID로 발급된다 — 백엔드 GOOGLE_CLIENT_IDS와 맞아야 한다.
    GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
    googleConfigured = true;
  }

  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();
  if (response.type !== "success") return null; // cancelled

  const idToken = response.data.idToken;
  if (!idToken) {
    throw new Error("구글 응답에 ID 토큰이 없습니다. 웹 클라이언트 ID 설정을 확인하세요.");
  }
  return signInWithSocial("google", idToken);
}

// SDK마다 취소 에러의 모양이 제각각이라 메시지로 판별한다 (카카오는 취소 시 reject).
function isCancelError(error: unknown): boolean {
  return error instanceof Error && /cancel/i.test(error.message);
}
