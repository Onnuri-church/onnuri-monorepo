import { Pressable, Text, View } from "react-native";

interface BulletinCardProps {
  date: string;
  title: string;
  onBulletinPress?: () => void;
  onSharePress?: () => void;
}

// 주보 목록의 한 줄. 왼쪽에 발행일과 설교 제목이 쌓이고, 오른쪽에 주보·나눔지 두 개의 링크가 온다.
// 시안 확정값(Frame 7373): 왼쪽 열 높이 47 = 발행일 13*1.4 + 간격 8 + 제목 15*1.4.
// 위아래 18(py-4.5)은 시안의 구분선 간격 83에서 나온다 — 행 사이 36을 구분선이 반씩 나눠 가진다.
export function BulletinCard({ date, title, onBulletinPress, onSharePress }: BulletinCardProps) {
  return (
    <View className="flex-row items-center justify-between border-b border-background-muted py-4.5">
      <View className="flex-1 gap-2">
        <Text className="text-body-small text-primary-normal">{date}</Text>
        <Text className="text-body-main text-text-normal">{title}</Text>
      </View>
      <View className="flex-row items-center gap-2.5">
        <Pressable
          onPress={onBulletinPress}
          style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
        >
          <Text className="text-body-main text-primary-normal">주보</Text>
        </Pressable>
        {/* 구분자는 링크와 색은 같고 스타일만 작다 — 시안이 링크는 Body/Main, /는 Body/Small이다. */}
        <Text className="text-body-small text-primary-normal">/</Text>
        <Pressable
          onPress={onSharePress}
          style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
        >
          <Text className="text-body-main text-primary-normal">나눔지</Text>
        </Pressable>
      </View>
    </View>
  );
}
