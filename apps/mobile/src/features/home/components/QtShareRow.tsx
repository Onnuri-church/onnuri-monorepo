import { Pressable, Text, View } from "react-native";

interface QtShareRowProps {
  author: string;
  /** 본문 범위 (예: "룻기 2:16-23") */
  passage: string;
  title: string;
  onPress?: () => void;
}

// 홈 큐티나눔 목록 한 줄. 시안 확정값: 프로필 48, 프로필-글 간격 12, 제목-부제 간격 4.
// 행 높이는 시안이 44인데 그 안의 프로필이 48이라 어긋나 있어서 48로 맞췄다 (확인 완료) —
// 목록 전체 높이(164)를 지키려고 행 사이 간격을 16에서 10으로 줄인 건 호출부(HomeScreen)에 있다.
export function QtShareRow({ author, passage, title, onPress }: QtShareRowProps) {
  return (
    <Pressable className="h-12 flex-row items-center gap-3 active:opacity-60" onPress={onPress}>
      {/* 프로필 이미지는 아직 시안에 자리만 있어서 회색 원으로 둔다 (QtPostCard와 같은 처리). */}
      <View className="h-12 w-12 rounded-full bg-text-assistive" />
      <View className="flex-1 gap-1">
        <Text className="text-body-large text-text-normal" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-body-regular text-text-alternative" numberOfLines={1}>
          {author} | {passage}
        </Text>
      </View>
    </Pressable>
  );
}
