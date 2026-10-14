import { Pressable, Text, View } from "react-native";

interface MultiSelectChipsProps {
  label: string;
  /** 라벨 아래 한 줄 안내 (선택) */
  hint?: string;
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
}

// 여러 개를 고르는 토글 칩 묶음 (소속 팀처럼 1개 이상 N개를 고르는 항목용).
// 단일 선택은 SelectField를 쓴다. 하나도 안 고른 상태가 "없음"이다.
export function MultiSelectChips({ label, hint, options, selected, onToggle }: MultiSelectChipsProps) {
  return (
    <View className="py-4">
      <Text className="text-body-main text-text-normal">{label}</Text>
      {hint && <Text className="mt-1 text-caption-main text-text-alternative">{hint}</Text>}
      <View className="mt-4 flex-row flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <Pressable
              key={option}
              onPress={() => onToggle(option)}
              style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
              className={
                isSelected
                  ? "h-10 items-center justify-center rounded-2xl border border-primary-normal bg-background-alternative px-4"
                  : "h-10 items-center justify-center rounded-2xl border border-text-alternative bg-background-muted px-4"
              }
            >
              <Text
                className={
                  isSelected
                    ? "text-body-main text-primary-normal"
                    : "text-body-main text-text-alternative"
                }
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
