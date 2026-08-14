import { Image, Text, View } from "react-native";

interface CommentItemProps {
  authorName: string;
  /** 이미 가공된 표시용 문자열 (예: "2분 전"). 화면이 시간 계산을 하지 않는다. */
  timeAgo: string;
  content: string;
  avatarUrl?: string | null;
}

// 댓글 한 줄. 댓글에 작성자·시간이 있다는 걸 아는 도메인 컴포넌트라 feature에 둔다
// (DESIGN.md 컴포넌트 배치 규칙). 다른 게시판이 같은 모양을 쓰게 되면 composed로 올린다.
export function CommentItem({ authorName, timeAgo, content, avatarUrl }: CommentItemProps) {
  return (
    <View className="flex-row gap-2 py-2">
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} className="h-7 w-7 rounded-full" />
      ) : (
        <View className="h-7 w-7 rounded-full bg-text-assistive" />
      )}
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-label-medium text-text-normal">{authorName}</Text>
          <Text className="text-caption-small text-text-alternative">{timeAgo}</Text>
        </View>
        <Text className="mt-1 text-body-small text-text-neutral">{content}</Text>
      </View>
    </View>
  );
}
