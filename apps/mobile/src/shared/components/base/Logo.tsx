import { Image } from "react-native";

import LogoHorizontal from "../../assets/logo/logo-horizontal.svg";
import WordmarkTitle from "../../assets/logo/wordmark-title.svg";

// 색이 고정된 브랜드 자산들. 원본 비율(가로/세로)과 원본 크기를 여기 모아두고,
// 밖에서는 width만 넘긴다 — height는 비율로 계산해서 자산이 찌그러지지 않게 한다.
// symbol만 PNG(1024×1024)라 Image로 그린다. SVG 버전을 받으면 여기만 바꾸면 된다.
const VARIANTS = {
  horizontal: { ratio: 222 / 46, width: 222 },
  symbol: { ratio: 1, width: 205 },
  wordmark: { ratio: 150 / 104, width: 150 },
} as const;

interface LogoProps {
  /** horizontal: 가로형 로고 / symbol: 정사각 심볼 / wordmark: '말씀'으로 보내소서 타이틀 */
  variant?: keyof typeof VARIANTS;
  /** 가로 길이(px). 세로는 원본 비율로 계산된다. 기본값은 원본 크기. */
  width?: number;
}

// 로고는 아이콘이 아니라 색이 고정된 브랜드 자산이라 Icon을 거치지 않는다.
// Icon은 정사각형(width=height=size)을 강제하는데 로고는 비율이 제각각이라 찌그러지고,
// 색도 svgr 치환 대상이 아니라서 color prop을 두지 않는다 — 밖에서 색을 바꿀 수 있게 하는 순간
// SVG에 색을 박아둔 전제가 무너진다. 자세한 배경은 DESIGN.md 아이콘 규칙의 로고 예외 조항 참고.
export function Logo({ variant = "horizontal", width = VARIANTS[variant].width }: LogoProps) {
  const height = width / VARIANTS[variant].ratio;

  if (variant === "symbol") {
    return (
      <Image
        source={require("../../assets/logo/logo-symbol.png")}
        style={{ width, height }}
        resizeMode="contain"
      />
    );
  }

  const Source = variant === "horizontal" ? LogoHorizontal : WordmarkTitle;

  return <Source width={width} height={height} />;
}
