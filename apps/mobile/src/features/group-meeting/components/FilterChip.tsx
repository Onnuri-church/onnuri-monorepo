import { Pressable, Text } from "react-native";

interface FilterChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

// 목록 필터용 누를 수 있는 칩. shared/components/base/Chip은 표시 전용(View)이라 여기서 따로 둔다 —
// 두 번째 화면이 같은 필터 UI를 쓰게 되면 그때 base로 올린다 (DESIGN.md 컴포넌트 배치 규칙).
// 눌림 상태는 prop이 아니라 Pressable 콜백으로 처리한다.
export function FilterChip({ label, selected, onPress }: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      className={
        selected
          ? "rounded-full border border-primary-normal bg-primary-normal px-3 py-1"
          : "rounded-full border border-text-assistive bg-background-normal px-3 py-1"
      }
      style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
    >
      <Text
        className={
          selected
            ? "text-label-medium text-background-normal"
            : "text-label-medium text-text-neutral"
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}
