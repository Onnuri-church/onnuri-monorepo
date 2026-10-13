import { Text, View } from "react-native";

interface UnreadBadgeProps {
  /** 안 읽은 개수. 0이면 아무것도 그리지 않는다 */
  count: number;
  /** true면 숫자 없이 빨간 점만 그린다 (아이콘·입구처럼 "뭔가 있다"만 알릴 때) */
  dot?: boolean;
  /** 아이콘 모서리에 겹쳐 붙일 때의 절대 위치 스타일 */
  className?: string;
}

const MAX_COUNT = 99;

// 안 읽은 메시지 표시 — 방 목록은 숫자 뱃지, 아이콘·입구는 빨간 점 (2026-10-14 확정).
// 99를 넘으면 "99+"로 줄인다.
export function UnreadBadge({ count, dot = false, className }: UnreadBadgeProps) {
  if (count <= 0) return null;
  if (dot) {
    return <View className={["h-2.5 w-2.5 rounded-full bg-semantic-danger", className].filter(Boolean).join(" ")} />;
  }
  return (
    <View
      className={[
        "h-5 min-w-5 items-center justify-center rounded-full bg-semantic-danger px-1.5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Text className="text-caption-small text-text-disable">
        {count > MAX_COUNT ? `${MAX_COUNT}+` : String(count)}
      </Text>
    </View>
  );
}
