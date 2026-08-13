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
        // 로고는 일부러 넣지 않는다. 네이티브 스플래시는 배경색만 맡고 로고는 RN 스플래시가 그리므로,
        // 두 화면이 어긋날 여지가 배경색 하나로 줄어든다.
        // 단 Android 12+는 시스템이 아이콘을 강제로 넣을 수 있어서(windowSplashScreenBehavior가
        // icon_preferred로 박힌다) 실제 빌드에서 확인이 필요하다 — Expo Go에서는 확인되지 않는다.
        backgroundColor: colors.primary.normal,
      },
    ],
  ],
});
