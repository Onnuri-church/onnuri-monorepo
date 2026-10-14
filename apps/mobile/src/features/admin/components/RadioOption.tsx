import { Pressable, Text, View } from "react-native";

interface RadioOptionProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

// 관리자 시안의 라디오 한 개 — 선택되면 22px 초록 원 + 흰 체크, 아니면 20px 흰 원 + 회색 테두리.
// 라벨도 선택 시 굵어진다 (시안 700 → body-main, 미선택 400 → body-regular).
export function RadioOption({ label, selected, onPress }: RadioOptionProps) {
  return (
    <Pressable
      className="flex-row items-center gap-2"
      onPress={onPress}
      style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
    >
      {selected ? (
        <View className="h-5.5 w-5.5 items-center justify-center rounded-full bg-primary-normal">
          <Text className="text-caption-small text-text-disable">✓</Text>
        </View>
      ) : (
        /* 시안 테두리는 1.5px이지만 기본 스케일에 없어 1px(border)로 넣었다 (ProfileSetup 성별 버튼과 같은 처리) */
        <View className="h-5 w-5 rounded-full border border-background-assistive bg-background-normal" />
      )}
      <Text
        className={
          selected ? "text-body-main text-text-normal" : "text-body-regular text-text-normal"
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}
