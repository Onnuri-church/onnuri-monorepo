// react-native-svg-transformer가 SVG를 컴포넌트로 바꿀 때 쓰는 설정.
// SVG 파일에 박혀 있는 색을 전부 currentColor로 치환해서, 색은 파일이 아니라
// 사용처(Icon 컴포넌트의 color prop)가 정하게 한다 — 브랜드 컬러가 바뀌어도
// 아이콘만 옛날 색으로 남는 상황을 막는다. 색 목록은 tokens.js를 따른다.
//
// svgoConfig는 여기서 건드리지 않는다 — 지정하는 순간 transformer의 기본값을
// 통째로 덮어써서 removeViewBox: false가 풀리고, viewBox가 사라지면 아이콘이 스케일되지 않는다.
module.exports = {
  replaceAttrValues: {
    "#888888": "currentColor", // icon.normal
    "#444444": "currentColor", // icon.strong
    "#D9D9D9": "currentColor", // text.assistive
    "#276E4C": "currentColor", // primary.normal
    "#111111": "currentColor", // icon.strongest
    "#436E5D": "currentColor", // icon.accent
    "#EF4444": "currentColor", // icon.danger
  },
};
