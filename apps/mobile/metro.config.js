const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// pnpm uses symlinked node_modules; Metro needs these enabled to resolve
// hoisted/workspace packages like @onnuri/shared correctly.
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

// SVG를 이미지가 아니라 React 컴포넌트로 import한다 (react-native-svg-transformer).
// assetExts에서 빼고 sourceExts에 넣어야 소스로 취급된다.
// 반드시 withNativeWind() 호출 전에 설정할 것 — NativeWind가 transformerPath를 자기 것으로
// 교체하면서 기존 값을 체이닝하므로, 순서가 뒤집히면 SVG 변환이 통째로 무시된다.
config.transformer.babelTransformerPath = require.resolve("react-native-svg-transformer/expo");
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== "svg");
config.resolver.sourceExts = [...config.resolver.sourceExts, "svg"];

// inlineRem은 Tailwind 스케일(rem 기반, `1` = `0.25rem`)을 px로 환산하는 기준이다. NativeWind
// 기본값은 14(= RN 기본 폰트 크기)라 그대로 두면 한 칸이 3.5px이 되므로, 웹과 같은 16으로 맞춰
// 한 칸 = 4px을 보장한다. 바꾸면 앱 전체의 여백·사이즈가 한꺼번에 움직인다.
module.exports = withNativeWind(config, { input: "./global.css", inlineRem: 16 });
