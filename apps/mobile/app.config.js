const { colors } = require("./src/shared/theme/tokens");

// app.json을 그대로 이어받고 여기서는 스플래시 설정만 얹는다. JSON 대신 JS 설정을 쓰는 이유는
// 배경색을 tokens.js에서 가져오기 위해서다 — JSON에는 import가 없어서 그냥 두면 #276E4C가
// tokens.js와 app.json 두 곳에 따로 적히고, 한쪽만 바뀌어도 아무도 모른다.
// 토큰이 필요 없는 정적인 값은 계속 app.json에 둔다.

// 개발용 빌드(APP_VARIANT=development)는 앱 ID·이름을 바꿔 별도 앱으로 깐다 — 베타·실사용 앱과
// 한 폰에 나란히 설치돼서, 개발 앱을 깔려고 베타 앱을 지우지 않아도 된다.
// 스킴도 따로 둬야 딥링크가 두 앱 중 어디로 갈지 묻지 않는다.
// google-services.json에는 com.onnuri.mobile만 등록돼 있어 개발 앱에서는 뺀다 — 개발 앱은 푸시
// 토큰 발급이 실패하지만 PushNotificationGate가 실패를 삼켜 나머지는 정상 동작한다
// (푸시까지 확인하려면 Firebase에 .dev 앱을 추가하고 받은 파일로 바꾼다).
const IS_DEV_VARIANT = process.env.APP_VARIANT === "development";

// 구글 로그인 iOS (SCRUM-195) — iOS OAuth 클라이언트 ID("<번호>-xxx.apps.googleusercontent.com")를
// 뒤집은 URL 스킴이 Info.plist에 있어야 로그인 후 앱으로 돌아온다. ID가 없는 환경(안드로이드만 빌드)에서는
// 플러그인을 옵션 없이 얹는다 — 안드로이드 빌드는 이 값을 쓰지 않는다.
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_IOS_URL_SCHEME = GOOGLE_IOS_CLIENT_ID
  ? `com.googleusercontent.apps.${GOOGLE_IOS_CLIENT_ID.replace(".apps.googleusercontent.com", "")}`
  : null;

module.exports = ({ config }) => ({
  ...config,
  ...(IS_DEV_VARIANT && {
    name: "온누리 DEV",
    scheme: "onnurichurch-dev",
    android: {
      ...config.android,
      package: "com.onnuri.mobile.dev",
      googleServicesFile: undefined,
    },
    ios: {
      ...config.ios,
      bundleIdentifier: "com.onnuri.mobile.dev",
    },
  }),
  plugins: [
    ...(config.plugins ?? []),
    GOOGLE_IOS_URL_SCHEME
      ? ["@react-native-google-signin/google-signin", { iosUrlScheme: GOOGLE_IOS_URL_SCHEME }]
      : "@react-native-google-signin/google-signin",
    // 사진 선택·촬영 — iOS 권한 문구 (없으면 심사 거절 사유, SCRUM-195)
    [
      "expo-image-picker",
      {
        photosPermission: "게시글·프로필에 올릴 사진을 고르려면 사진 접근 권한이 필요해요.",
        cameraPermission: "게시글·프로필에 올릴 사진을 찍으려면 카메라 접근 권한이 필요해요.",
      },
    ],
    // 데이터 다운로드(엑셀)의 공유 시트용 — expo install이 동적 config라 자동 추가를 못 해 수동 등록.
    "expo-sharing",
    // QR 출석 스캔용 카메라 — iOS 권한 문구는 여기서 정한다 (없으면 심사 거절 사유).
    [
      "expo-camera",
      { cameraPermission: "출석 QR을 스캔하려면 카메라 접근 권한이 필요해요." },
    ],
    // 카카오 SDK의 네이티브 설정(매니페스트의 앱 키·리다이렉트 스킴)은 빌드 시점에 키가 필요하다.
    // 키가 없는 환경(웹 미리보기, 키를 아직 안 채운 팀원)에서도 동작해야 하므로 키가 있을 때만 얹는다.
    // 빌드하는 환경에도 이 env가 설정돼 있어야 한다 — AGENTS.md "소셜 로그인 키" 참고.
    // android 옵션을 넘겨야 plugin이 매니페스트를 건드린다 — 없으면 `if (android)`에서 조용히
    // 건너뛰어, 빌드는 성공하는데 kakao{앱키}://oauth 리다이렉트를 받을 액티비티가 없는 APK가 나온다
    // (로그인 창은 뜨지만 콜백이 안 돌아와 무반응).
    ...(process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY
      ? [
          [
            "@react-native-kakao/core",
            {
              nativeAppKey: process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY,
              android: { authCodeHandlerActivity: true },
            },
          ],
        ]
      : []),
    [
      "expo-splash-screen",
      {
        // 네이티브 스플래시는 배경색만 맡고 로고는 RN 스플래시가 그린다 — 두 화면이 어긋날
        // 여지가 배경색 하나로 줄어든다.
        backgroundColor: colors.primary.normal,
        // 그렇다고 로고를 그냥 빼면 안 된다. expo-splash-screen은 image 없이도 styles.xml에
        // windowSplashScreenAnimatedIcon="@drawable/splashscreen_logo"를 항상 쓰면서 정작
        // 드로어블은 만들지 않아, 릴리스 빌드가 aapt2 링킹에서 깨진다. 게다가 Android 12+는
        // 아이콘 슬롯을 비워두면 런처 아이콘을 대신 채운다. 그래서 투명 드로어블을 직접 넣어
        // 슬롯을 채우면서 화면에는 배경색만 남긴다.
        android: {
          drawable: { icon: "./assets/android-splash-logo.xml" },
        },
      },
    ],
  ],
});
