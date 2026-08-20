const { colors } = require("./src/shared/theme/tokens");

// app.json을 그대로 이어받고 여기서는 스플래시 설정만 얹는다. JSON 대신 JS 설정을 쓰는 이유는
// 배경색을 tokens.js에서 가져오기 위해서다 — JSON에는 import가 없어서 그냥 두면 #276E4C가
// tokens.js와 app.json 두 곳에 따로 적히고, 한쪽만 바뀌어도 아무도 모른다.
// 토큰이 필요 없는 정적인 값은 계속 app.json에 둔다.
module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
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
