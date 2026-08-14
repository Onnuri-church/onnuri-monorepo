import { Pressable, Text } from "react-native";

interface ButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}

// 시안 확정값(402pt 프레임): 362x48. 폭은 호출부의 좌우 여백이 정하고 높이만 h-12(48)로 고정한다.
// 눌림은 active: 변형으로 준다 — className과 함수형 style을 같이 주면 NativeWind가
// 함수 style을 무시해서 크기까지 통째로 빠진다.
export function Button({ label, onPress, disabled }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={
        disabled
          ? "h-12 items-center justify-center rounded-xl bg-text-assistive"
          : "h-12 items-center justify-center rounded-xl bg-primary-normal active:opacity-80"
      }
    >
      <Text className="text-body-main text-background-normal">{label}</Text>
    </Pressable>
  );
}
