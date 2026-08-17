// react-native-svg-transformer가 SVG를 컴포넌트로 바꿀 때 쓰는 설정.
// SVG 파일에 박혀 있는 색을 전부 currentColor로 치환해서, 색은 파일이 아니라
// 사용처(Icon 컴포넌트의 color prop)가 정하게 한다 — 브랜드 컬러가 바뀌어도
// 아이콘만 옛날 색으로 남는 상황을 막는다. 색 목록은 tokens.js를 따른다.
//
// 표기가 정확히 일치해야 치환된다 — 색을 파싱해 비교하는 게 아니라 문자열을 그대로 비교하므로
// `white` / `#FFFFFF` / `#ffffff` / `#FFF`는 전부 다른 값이다. 새 SVG를 추가할 때는
// 아래 목록의 표기(대문자 6자리 hex)에 파일 쪽을 맞춘다.
//
// 예외: 로고처럼 색이 고정된 다색 브랜드 자산(src/shared/assets/logo/)은 치환되면 안 되므로
// 일부러 목록에 없는 표기(`white` 키워드, 소문자 hex)를 쓴다. 그 파일들의 색 표기를 이 목록에
// 맞춰 "정리"하면 로고가 한 색으로 뭉개진다 — DESIGN.md 아이콘 규칙의 로고 예외 조항 참고.
//
// svgoConfig는 여기서 건드리지 않는다 — 지정하는 순간 transformer의 기본값을
// 통째로 덮어써서 removeViewBox: false가 풀리고, viewBox가 사라지면 아이콘이 스케일되지 않는다.
// (기본값의 convertColors: false도 같이 풀리는데, 그러면 SVGO가 #888888을 #888로 줄여버려서
//  아래 치환이 통째로 안 걸린다.)
module.exports = {
  replaceAttrValues: {
    "#888888": "currentColor", // icon.normal
    "#444444": "currentColor", // icon.strong
    "#040509": "currentColor", // icon.strongest
    "#D9D9D9": "currentColor", // text.assistive
    "#276E4C": "currentColor", // primary.normal
    "#111111": "currentColor", // text.normal
    "#436E5D": "currentColor", // icon.accent
    "#EF4444": "currentColor", // semantic.danger
    // 흰색은 hex로만 등록하고 `white` 키워드는 등록하지 않는다 — user.svg가 clipPath 안 마스크에
    // fill="white"를 쓰는데, 그건 화면에 보이는 색이 아니라 치환하면 안 되기 때문이다.
    // (아래 "표기가 정확히 일치해야" 참고: `white`와 `#FFFFFF`는 서로 다른 값으로 취급된다.)
    "#FFFFFF": "currentColor", // icon.disable / text.disable
  },
};
