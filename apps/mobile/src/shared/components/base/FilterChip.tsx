import { Text } from "react-native";

import { PressableScale } from "./PressableScale";

interface FilterChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

const chipStyle = "rounded-full border px-3 py-1"
const textStyle = "text-label-medium"

// 목록 필터용 누를 수 있는 칩. shared/components/base/Chip은 표시 전용(View)이라 따로 둔다.
// 눌림은 PressableScale이 스프링으로 준다.
export function FilterChip({ label, selected, onPress }: FilterChipProps) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.94}
      className={`${chipStyle} ${
        selected
          ? "border-chip-selected bg-chip-selected"
          : "border-text-assistive"
      }`}
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
    </PressableScale>
  );
}
