// metro.config.js에서 SVG를 react-native-svg 컴포넌트로 변환하므로,
// TS에도 *.svg import가 이미지 경로(string)가 아니라 컴포넌트라고 알려준다.
declare module "*.svg" {
  import type * as React from "react";
  import type { SvgProps } from "react-native-svg";

  const content: React.FC<SvgProps>;
  export default content;
}
