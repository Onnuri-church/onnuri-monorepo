const { colors, fontFamily, fontSize } = require("./src/shared/theme/tokens");

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
    extend: {
      // sizing / spacing / radius는 Tailwind 기본 스케일만 사용 — 여기에 커스텀 값을 추가하지 않는다 (DESIGN.md 사이즈 규칙).
      fontFamily,
      fontSize,
    },
  },
  plugins: [],
};
