// 디자인 토큰의 단일 소스. tailwind.config.js가 이 파일을 참조하고,
// className을 못 쓰는 곳(React Navigation 옵션, StatusBar 등)에서도 여기서 직접 import해서 쓴다.
// 네이티브 스플래시 배경색이 필요한 app.config.js도 여기서 가져간다.
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
  // assistive(#D9D9D9)·muted(#ECECEC)는 각각 text.assistive · chip.bg와 값이 같다.
  // 용도가 다른 별개 토큰이라 그대로 두고, 한쪽 값이 바뀌면 다른 쪽은 따라가지 않는다.
  background: {
    normal: "#FFFFFF",
    alternative: "#EFF7F3",
    assistive: "#D9D9D9",
    muted: "#ECECEC",
    dark: "#000000",
    gold: "#F3EAD8",
    red: "#FBEAE8",
  },
  text: {
    normal: "#111111",
    neutral: "#444444",
    alternative: "#888888",
    assistive: "#D9D9D9",
    disable: "#FFFFFF",
    brown: "#5C4A2A",
  },
  // accent는 아이콘 원본 SVG에만 있던 색을 토큰으로 올린 것으로, 컬러차트에 대응 항목이 없다.
  // 로고(assets/logo/)에 시안 확정값으로 박힌 색과 같아서, 아이콘용 토큰으로 남길지
  // 로고 전용으로 접을지 미확인 — DESIGN.md 오픈 이슈 참고.
  icon: {
    normal: "#888888",
    strong: "#444444",
    strongest: "#040509",
    accent: "#436E5D",
    disable: "#FFFFFF",
  },
  // chip. 구분용 팔레트(purple~indigo)는 배경(bg)이 공통이고 글자색만 다르고,
  // 모집 상태(open/closed)는 반대로 글자가 흰색이고 배경이 상태별로 다르다.
  chip: {
    bg: "#ECECEC",
    // 필터 칩이 선택됐을 때의 배경 (시안 확정값). icon.accent와 값이 같지만 용도가 다른
    // 별개 토큰이라 그대로 둔다 — 위 background.assistive / text.assistive와 같은 취급이다.
    selected: "#436E5D",
    open: "#444444",
    closed: "#888888",
    purple: "#8C00BF",
    blue: "#0086BF",
    red: "#BF0000",
    yellow: "#BFA200",
    green: "#33BF00",
    orange: "#D16900",
    indigo: "#3400D1",
  },
  // warning / danger는 진한 전경색이지만 info만 아주 밝은 틴트다 — 셋을 같은 감각으로 쓰면 안 된다.
  // info를 글자색으로 쓰면 흰 배경에서 사실상 안 보인다 (배경 전용).
  semantic: {
    warning: "#A87836",
    danger: "#EF4444",
    info: "#E9E9F2",
  },
};

// 그림자. NativeWind는 shadow-*를 RN의 shadowColor/shadowOffset/shadowRadius로 변환하면서
// shadowOpacity를 1로 고정하므로, 투명도는 색의 알파(#RRGGBBAA)에 넣어야 한다.
// spread(4번째 값)는 RN에 대응이 없어 무시된다 — 0이 아닌 값이 필요하면 시안을 다시 확인한다.
// card = primary.normal(#276E4C) 10%, nav = 검정 3%(시안의 drop-shadow).
const boxShadow = {
  card: "0px 1px 20px 0px #276E4C1A",
  nav: "0px -5px 52px 0px #00000008",
};

// 안드로이드 전용 그림자 깊이. 키 이름을 boxShadow와 맞춰야 짝이 맞는다.
// 지정하지 않으면 NativeWind가 blur(20)를 그대로 elevation으로 쓰는데 카드에는 과하다.
// nav가 0인 건 값을 안 정해서가 아니다 — 안드로이드 elevation은 항상 아래로 그려져서
// 위로 뜨는 탭바 그림자를 표현할 수 없다. 그렇다고 비워두면 NativeWind가 blur(52)를
// 그대로 elevation으로 써서 iOS엔 거의 안 보이는 3% 그림자가 안드로이드에서만 시커멓게 나온다.
const elevation = {
  card: 2,
  nav: 0,
};

// 사이즈 스케일 예외. DESIGN.md 사이즈 규칙은 Tailwind 기본 스케일만 쓰도록 하고 있는데,
// 기본 스케일에 18이 없어서(...12, 14, 16, 20...) 시안의 72px을 표현할 방법이 없다.
// 시안 확정값이라 예외로 추가한다. rem이 아니라 px로 적는다 — metro.config.js에서
// inlineRem: 16으로 맞춰뒀으므로 키 × 4 = px이 되어 기본 스케일과 규칙이 일치한다(17 → 68px).
const spacing = {
  // 이미지 페이저 인디케이터의 점 크기 (시안 확정값). 기본 스케일이 1.5(6px) → 2(8px)로
  // 건너뛰어 7px이 없다. 점이 작아서 1px 차이가 비율로는 14%라 그대로 눈에 띈다.
  1.75: "7px",
  // 주보 목록 행의 위아래 여백 (시안 확정값): 구분선 간격 83 = 내용 47 + 18*2.
  // 기본 스케일이 4(16px) → 5(20px)로 건너뛰어 18px이 없다.
  4.5: "18px",
  // 취향 소그룹 상세 InfoBox (시안 확정값): 라벨-값 간격 30, 라벨 열 폭 42, 행 높이 49.
  // 4의 배수가 아니라 키가 소수로 떨어진다 — 기본 스케일도 0.5/1.5/2.5를 쓰므로 규칙은 유지된다.
  7.5: "30px",
  10.5: "42px",
  12.25: "49px",
  // 스플래시 로고를 화면 정중앙에서 34px 위로 올리기 위한 값. justify-center 컨테이너에서
  // padding/margin은 중심을 그 절반만큼만 옮기므로 34가 아니라 2배인 68이다. 34로 고치지 말 것.
  // 하단 탭 가운데 원형 버튼의 지름(68)도 같은 값을 쓴다 — 우연히 같은 숫자라 한쪽 시안이
  // 바뀌면 여기서 갈라내야 한다.
  17: "68px",
  18: "72px",
  // 부서활동 상세 (시안 확정값). 기본 스케일이 80(320px) → 96(384px)으로 건너뛰어 360px이 없다.
  90: "360px",
  // 큐티나눔 상세 (시안 확정값). 기본 스케일이 96(384px)에서 끝나 400px이 없다.
  100: "400px",
};

// 라운드 예외. Tailwind 기본 borderRadius 스케일은 rounded-2xl(16px)에서 rounded-3xl(24px)로 건너뛰어서
// 시안의 20px(로그인 버튼)을 표현할 방법이 없다. 시안 확정값이라 예외로 추가한다 —
// 키 번호는 spacing과 같은 규칙(키 × 4 = px)을 따른다.
const borderRadius = {
  5: "20px",
  2.5: "10px",
};

// 폰트 패밀리(1-1): 한글/영문·숫자 모두 Pretendard.
const fontFamily = {
  pretendard: ["Pretendard-Regular"],
  "pretendard-medium": ["Pretendard-Medium"],
  "pretendard-semibold": ["Pretendard-SemiBold"],
  "pretendard-bold": ["Pretendard-Bold"],
};

// 타입 스케일(1-2). 사이즈 / 행간 / 자간 / 굵기를 한 클래스로 묶는다 —
// `text-title` 하나만 쓰면 22px·Bold까지 전부 정해진다. lh(line-height)는 label-nav만 빼고
// 전부 140%(unitless), ls(letter-spacing)는 label-medium/label-small/label-nav를 뺀 나머지가
// 전부 -1% (%→em 변환).
// [사이즈, 자간, 폰트 파일, (선택)행간] 순서 — 행간은 안 적으면 140%다.
const TEXT_STYLE = {
  title: ["22px", "-0.01em", "Pretendard-Bold"],
  "heading-main": ["20px", "-0.01em", "Pretendard-Bold"],
  "heading-medium": ["20px", "-0.01em", "Pretendard-SemiBold"],
  "heading-small": ["18px", "-0.01em", "Pretendard-SemiBold"],
  "body-main": ["15px", "-0.01em", "Pretendard-SemiBold"],
  "body-medium": ["15px", "-0.01em", "Pretendard-Medium"],
  "body-regular": ["15px", "-0.01em", "Pretendard-Regular"],
  "body-small": ["13px", "-0.01em", "Pretendard-Regular"],
  "body-small-bold": ["13px", "-0.01em", "Pretendard-ExtraBold"],
  "label-medium": ["13px", "-0.03em", "Pretendard-Medium"],
  "caption-main": ["13px", "-0.01em", "Pretendard-Medium"],
  "label-small": ["12px", "-0.03em", "Pretendard-Regular"],
  // 하단 탭 라벨 전용. Figma 레이어 이름은 label-small과 같은 "Label/Small"이지만 값이 셋 다 다르다
  // (굵기 SemiBold, 자간 +1%, 행간 14px 고정). 같은 토큰의 변형이 아니라 별개 스타일이라 따로 등록한다 —
  // label-small인 줄 알고 가져다 쓰면 자간·행간이 조용히 어긋난다.
  "label-nav": ["12px", "0.01em", "Pretendard-SemiBold", "14px"],
  "caption-small": ["10px", "-0.01em", "Pretendard-Medium"],
};

// tailwind.config.js가 components 레이어에 등록한다. utilities 레이어인 font-pretendard-*가
// 항상 뒤에 오므로, 굵기만 다르게 써야 하는 곳은 클래스를 덧붙여 덮어쓸 수 있다.
const textStyles = Object.fromEntries(
  Object.entries(TEXT_STYLE).map(([name, [fontSize, letterSpacing, family, lineHeight = "1.4"]]) => [
    `.text-${name}`,
    { fontSize, lineHeight, letterSpacing, fontFamily: family },
  ]),
);

module.exports = { colors, fontFamily, textStyles, boxShadow, elevation, spacing, borderRadius };
