import { View } from "react-native";

interface PageIndicatorProps {
  /** 점 개수 */
  count: number;
  /** 채워질 점의 인덱스(0부터) */
  current: number;
  className?: string;
}

// 가로로 넘기는 목록의 현재 위치를 점으로 보여준다. 도메인을 모르고 개수와 인덱스만 받는다.
// 점 크기 7px은 기본 스케일에 없어서 tokens.js의 spacing에 예외로 등록해 뒀다(w-1.75).
export function PageIndicator({ count, current, className }: PageIndicatorProps) {
  return (
    <View className={["flex-row justify-center gap-2.5", className].filter(Boolean).join(" ")}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          className={`h-1.75 w-1.75 rounded-full ${
            index === current ? "bg-primary-normal" : "bg-background-assistive"
          }`}
        />
      ))}
    </View>
  );
}
