import { type ReactNode } from "react";
import { Text, View } from "react-native";

interface FieldProps {
  label: string;
  children: ReactNode;
}

// "라벨 + 콘텐츠" 묶음. 글쓰기 계열 화면의 모든 필드가 이 패턴이라,
// 라벨 타이포와 라벨-콘텐츠 간격(시안 확정 16px)을 여기서 고정한다.
export function Field({ label, children }: FieldProps) {
  return (
    <View>
      <Text className="text-body-main text-text-normal">{label}</Text>
      <View className="mt-4">{children}</View>
    </View>
  );
}
