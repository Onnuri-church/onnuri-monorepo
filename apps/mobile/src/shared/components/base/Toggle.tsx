import { Pressable, View } from "react-native";

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

// iOS 스타일 토글 (시안 확정값: 트랙 35×22 radius 16, 노브 20 원형).
// RN 기본 Switch는 51×31로 고정이라 시안 크기를 맞출 수 없어 직접 그린다.
// 시안에는 켜짐 상태만 있다 — 꺼짐 트랙 색(background.muted)은 임시값이라 확인 필요.
// 노브 그림자(0 3 7 12%)는 등록된 그림자 토큰에 없어 생략 — 필요해지면 토큰 추가 후 적용.
export function Toggle({ value, onValueChange }: ToggleProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      className={`h-5.5 w-8.75 justify-center rounded-2xl p-px ${
        value ? "items-end bg-primary-normal" : "items-start bg-background-muted"
      }`}
    >
      <View className="h-5 w-5 rounded-full bg-background-normal" />
    </Pressable>
  );
}
