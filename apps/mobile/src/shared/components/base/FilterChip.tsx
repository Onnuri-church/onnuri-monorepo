import { Pressable, Text } from "react-native";

interface FilterChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

const chipStyle = "rounded-full border px-3 py-1"
const textStyle = "text-label-medium"

// 목록 필터용 누를 수 있는 칩. shared/components/base/Chip은 표시 전용(View)이라 따로 둔다.
// 눌림 상태는 prop이 아니라 Pressable 콜백으로 처리한다.
export function FilterChip({ label, selected, onPress }: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`${chipStyle} ${
        selected
          ? "border-chip-selected bg-chip-selected"
          : "border-text-assistive"
      }`}
      style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
    >
      <Text
        className={`${textStyle} ${
            selected
                ? "text-background-alternative"
                : "text-text-neutral"
        }`
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}
