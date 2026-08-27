import { Text, View } from "react-native";

// 팔로워 노트 문항 번호 (시안: 18px 초록 원 + 흰 숫자). 작성·상세 화면이 같이 쓴다.
export function NoteNumberBadge({ number }: { number: number }) {
  return (
    <View className="h-4.5 w-4.5 items-center justify-center rounded-full bg-primary-normal">
      <Text className="text-caption-small text-text-disable">{number}</Text>
    </View>
  );
}
