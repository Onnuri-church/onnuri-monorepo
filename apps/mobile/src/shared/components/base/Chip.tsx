import { Text, View } from "react-native";

// NativeWind는 빌드 시점에 className을 정적으로 수집하므로 `text-chip-${color}` 같은 문자열 조합은
// 클래스가 생성되지 않는다 — 완성된 클래스 문자열을 맵으로 들고 간다.
// outline일 때 테두리는 글자와 같은 색을 쓰지만, text-*와 border-*는 다른 클래스라 둘 다 적어둔다.
const SOFT_BG = "bg-chip-bg";

const CHIP_STYLE = {
  // 구분용 팔레트 — 배경 공통, 글자색만 다름. 어느 색을 무엇에 쓸지는 쓰는 쪽이 정한다.
  purple: { bg: SOFT_BG, text: "text-chip-purple", border: "border-chip-purple" },
  blue: { bg: SOFT_BG, text: "text-chip-blue", border: "border-chip-blue" },
  red: { bg: SOFT_BG, text: "text-chip-red", border: "border-chip-red" },
  yellow: { bg: SOFT_BG, text: "text-chip-yellow", border: "border-chip-yellow" },
  green: { bg: SOFT_BG, text: "text-chip-green", border: "border-chip-green" },
  orange: { bg: SOFT_BG, text: "text-chip-orange", border: "border-chip-orange" },
  indigo: { bg: SOFT_BG, text: "text-chip-indigo", border: "border-chip-indigo" },
  // 모집 상태 — 글자 흰색, 배경만 다름
  open: {
    bg: "bg-chip-open",
    text: "text-background-normal",
    border: "border-background-normal",
  },
  closed: {
    bg: "bg-chip-closed",
    text: "text-background-normal",
    border: "border-background-normal",
  },
  primary: {
    bg: "bg-background-normal",
    text: "text-background-alternative",
    border: "border-background-alternative",
    // primary만 outline에서 색이 뒤집힌다 — 다른 칩처럼 테두리만 더하는 게 아니라서 따로 적는다.
    outline: {
      bg: "bg-background-alternative",
      text: "text-primary-normal",
      border: "border-primary-normal",
    },
  },
} as const;

interface ChipProps {
  color: keyof typeof CHIP_STYLE;
  outline?: boolean;
  text: string;
}

// outline 여부에 따라 모서리(8px / 알약)와 글자 굵기(medium / semibold)가 함께 바뀐다.
// 색은 outline 변형이 정의돼 있으면 그걸 쓰고, 없으면 원래 색 그대로 테두리만 더한다.
export function Chip({ color, outline = false, text }: ChipProps) {
  const base = CHIP_STYLE[color];
  const style = outline && "outline" in base ? base.outline : base;
  const shape = outline ? `rounded-lg border ${style.border}` : "rounded-full";
  const weight = outline ? "font-pretendard-medium" : "font-pretendard-semibold";

  return (
    <View className={`self-start px-2 py-0.5 ${style.bg} ${shape}`}>
      <Text className={`text-label-small ${weight} ${style.text}`}>{text}</Text>
    </View>
  );
}
