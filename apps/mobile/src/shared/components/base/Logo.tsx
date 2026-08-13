import LogoHorizontal from "../../assets/logo/logo-horizontal.svg";

// 원본 viewBox(222×46)의 가로세로비. width만 받고 height는 여기서 계산해 로고가 찌그러지지 않게 한다.
const ASPECT_RATIO = 222 / 46;

interface LogoProps {
  /** 가로 길이(px). 세로는 원본 비율로 계산된다. 기본값은 원본 크기. */
  width?: number;
}

// 로고는 아이콘이 아니라 색이 고정된 브랜드 자산이라 Icon을 거치지 않는다.
// Icon은 정사각형(width=height=size)을 강제하는데 로고는 222×46이라 비율이 깨지고,
// 색도 svgr 치환 대상이 아니라서 color prop을 두지 않는다 — 밖에서 색을 바꿀 수 있게 하는 순간
// SVG에 색을 박아둔 전제가 무너진다. 자세한 배경은 DESIGN.md 아이콘 규칙의 로고 예외 조항 참고.
export function Logo({ width = 222 }: LogoProps) {
  return <LogoHorizontal width={width} height={width / ASPECT_RATIO} />;
}
