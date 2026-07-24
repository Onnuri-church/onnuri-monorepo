// 디자인 토큰의 단일 소스. tailwind.config.js가 이 파일을 참조하고,
// className을 못 쓰는 곳(React Navigation 옵션, StatusBar 등)에서도 여기서 직접 import해서 쓴다.
// 값을 두 군데(여기 + 어딘가의 컴포넌트)에 따로 적지 않는다.

// DESIGN.md 컬러 규칙: semantic 토큰만 사용 (primitive 원시 스케일 없음 — 앞으로도 안 씀, 확인됨).
// tailwind.config.js가 theme.colors를 통째로 이걸로 교체하므로, 여기 없는 색은 클래스 자체가 존재하지 않는다
// (Tailwind 기본 팔레트 gray/blue/... 접근 불가 — DESIGN.md "정의되지 않은 기본 팔레트 금지" 규칙을 코드로 강제).
const colors = {
  transparent: "transparent",
  current: "currentColor",
  primary: {
    normal: "#276E4C",
  },
  background: {
    normal: "#FFFFFF",
    alternative: "#EFF7F3",
  },
  text: {
    normal: "#000000",
    neutral: "#444444",
    alternative: "#888888",
    assistive: "#D9D9D9",
    disable: "#FFFFFF",
  },
  icon: {
    normal: "#888888",
    strong: "#444444",
    disable: "#FFFFFF",
  },
};

// 폰트 패밀리(1-1): 한글/영문·숫자 모두 Pretendard.
const fontFamily = {
  pretendard: ["Pretendard-Regular"],
  "pretendard-medium": ["Pretendard-Medium"],
  "pretendard-semibold": ["Pretendard-SemiBold"],
  "pretendard-bold": ["Pretendard-Bold"],
};

// 타입 스케일(1-2). lh(line-height)는 전부 140%(=폰트 크기의 1.4배, unitless),
// ls(letter-spacing)는 label-medium/label-small만 -3%고 나머지는 전부 -1% (%→em 변환).
// 굵기는 각 사이즈 클래스와 아래 폰트 유틸리티를 페어로 사용:
//   title → font-pretendard-bold, heading-main → font-pretendard-bold
//   heading-medium → font-pretendard-semibold, heading-small → font-pretendard-semibold
//   body-main → font-pretendard-semibold, body-medium → font-pretendard-medium, body-small → font-pretendard(regular)
//   label-medium → font-pretendard-medium, label-small → font-pretendard(regular)
//   caption-main → font-pretendard-medium, caption-small → font-pretendard-medium
const fontSize = {
  title: ["22px", { lineHeight: "1.4", letterSpacing: "-0.01em" }],
  "heading-main": ["20px", { lineHeight: "1.4", letterSpacing: "-0.01em" }],
  "heading-medium": ["20px", { lineHeight: "1.4", letterSpacing: "-0.01em" }],
  "heading-small": ["18px", { lineHeight: "1.4", letterSpacing: "-0.01em" }],
  "body-main": ["15px", { lineHeight: "1.4", letterSpacing: "-0.01em" }],
  "body-medium": ["15px", { lineHeight: "1.4", letterSpacing: "-0.01em" }],
  "body-small": ["13px", { lineHeight: "1.4", letterSpacing: "-0.01em" }],
  "label-medium": ["13px", { lineHeight: "1.4", letterSpacing: "-0.03em" }],
  "label-small": ["12px", { lineHeight: "1.4", letterSpacing: "-0.03em" }],
  "caption-main": ["13px", { lineHeight: "1.4", letterSpacing: "-0.01em" }],
  "caption-small": ["10px", { lineHeight: "1.4", letterSpacing: "-0.01em" }],
};

module.exports = { colors, fontFamily, fontSize };
