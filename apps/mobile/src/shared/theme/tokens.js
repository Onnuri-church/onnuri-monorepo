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
  // strongest / danger / accent는 아이콘 원본 SVG에만 있던 색을 토큰으로 올린 것.
  // 기존 색과 미묘하게 다른데(strongest≠text.normal, accent≠primary.normal) 의도인지
  // 원본 불일치인지 미확인 — DESIGN.md 오픈 이슈 참고.
  icon: {
    normal: "#888888",
    strong: "#444444",
    strongest: "#111111",
    danger: "#EF4444",
    accent: "#436E5D",
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

// 타입 스케일(1-2). 사이즈 / 행간 / 자간 / 굵기를 한 클래스로 묶는다 —
// `text-title` 하나만 쓰면 22px·Bold까지 전부 정해진다. lh(line-height)는 전부 140%(unitless),
// ls(letter-spacing)는 label-medium/label-small만 -3%고 나머지는 전부 -1% (%→em 변환).
// [사이즈, 자간, 폰트 파일] 순서.
const TEXT_STYLE = {
  title: ["22px", "-0.01em", "Pretendard-Bold"],
  "heading-main": ["20px", "-0.01em", "Pretendard-Bold"],
  "heading-medium": ["20px", "-0.01em", "Pretendard-SemiBold"],
  "heading-small": ["18px", "-0.01em", "Pretendard-SemiBold"],
  "body-main": ["15px", "-0.01em", "Pretendard-SemiBold"],
  "body-medium": ["15px", "-0.01em", "Pretendard-Medium"],
  "body-small": ["13px", "-0.01em", "Pretendard-Regular"],
  "label-medium": ["13px", "-0.03em", "Pretendard-Medium"],
  "label-small": ["12px", "-0.03em", "Pretendard-Regular"],
  "caption-main": ["13px", "-0.01em", "Pretendard-Medium"],
  "caption-small": ["10px", "-0.01em", "Pretendard-Medium"],
};

// tailwind.config.js가 components 레이어에 등록한다. utilities 레이어인 font-pretendard-*가
// 항상 뒤에 오므로, 굵기만 다르게 써야 하는 곳은 클래스를 덧붙여 덮어쓸 수 있다.
const textStyles = Object.fromEntries(
  Object.entries(TEXT_STYLE).map(([name, [fontSize, letterSpacing, family]]) => [
    `.text-${name}`,
    { fontSize, lineHeight: "1.4", letterSpacing, fontFamily: family },
  ]),
);

module.exports = { colors, fontFamily, textStyles };
