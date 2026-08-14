const plugin = require("tailwindcss/plugin");

const {
  colors,
  fontFamily,
  textStyles,
  boxShadow,
  elevation,
  spacing,
  borderRadius,
} = require("./src/shared/theme/tokens");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./App.tsx", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    // colors는 extend가 아니라 통째로 교체 — Tailwind 기본 팔레트(gray/blue/...)를 아예 못 쓰게 막아서
    // DESIGN.md "semantic 토큰만 사용, 정의되지 않은 기본 팔레트 금지" 규칙을 강제한다.
    // 실제 값은 src/shared/theme/tokens.js가 단일 소스 — 여기서 중복 정의하지 않는다.
    colors,
    // fontSize는 일부러 교체하지 않는다 — Tailwind 기본 text-xs/sm/base/... 를 살려둔다.
    // 이미 기본 사이즈로 작성된 코드를 깨지 않기 위해서이고, "등록된 텍스트 스타일만 쓴다"는
    // 설정이 아니라 규칙으로 지킨다 (DESIGN.md 타이포그래피 규칙).
    // fontFamily는 통째로 교체 — Tailwind 기본 font-sans/serif/mono를 없앤다.
    // 남겨두면 등록 안 된 폰트로 렌더링되는데 눈으로는 구분이 잘 안 된다.
    fontFamily,
    extend: {
      // sizing / spacing / radius는 Tailwind 기본 스케일만 사용 — 기본 스케일로 표현 못 하는 시안 확정값만
      // tokens.js의 spacing에 예외로 등록한다 (DESIGN.md 사이즈 규칙의 예외 절차 참고).
      // 그림자는 Tailwind 기본값(shadow-sm/md/...)을 남겨둔 채 시안 토큰만 더한다.
      spacing,
      borderRadius,
      // elevation은 Tailwind 표준 키가 아니라 NativeWind가 안드로이드에서 읽는 키다.
      boxShadow,
      elevation,
    },
  },
  plugins: [
    // 텍스트 스타일은 components 레이어. utilities 레이어인 font-pretendard-*가 항상 뒤에 와서
    // 이기므로, shared/components/base에서 굵기만 바꿔 쓸 때 클래스를 덧붙이면 그대로 덮어써진다.
    plugin(({ addComponents }) => addComponents(textStyles)),
  ],
};
