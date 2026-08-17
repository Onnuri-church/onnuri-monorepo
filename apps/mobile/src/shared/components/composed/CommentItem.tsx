import { Image, Text, View } from "react-native";

interface CommentItemProps {
  authorName: string;
  /** 이미 가공된 표시용 문자열 (예: "2분 전"). 화면이 시간 계산을 하지 않는다. */
  timeAgo: string;
  content: string;
  avatarUrl?: string | null;
}

// 댓글 한 줄. 댓글에 작성자·시간이 있다는 걸 아는 조합 컴포넌트라 base가 아니라 composed에 둔다.
// 큐티나눔·기도요청 등 다른 게시판에서도 같은 모양을 쓸 예정이라 처음부터 공용으로 둔다.
export function CommentItem({ authorName, timeAgo, content, avatarUrl }: CommentItemProps) {
  return (
    <View className="flex-row gap-2 py-2">
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} className="h-9 w-9 rounded-full" />
      ) : (
        <View className="h-9 w-9 rounded-full bg-text-assistive" />
      )}
      <View className="flex-1 pt-1.5">
        <View className="flex-row items-center gap-2">
          <Text className="text-body-main text-text-normal">{authorName}</Text>
          <Text className="text-body-small text-text-alternative">{timeAgo}</Text>
        </View>
        <Text className="mt-1 text-body-medium text-text-neutral">{content}</Text>
      </View>
    </View>
  );
}
