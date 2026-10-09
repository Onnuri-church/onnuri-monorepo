import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { Avatar } from "../base/Avatar";

interface CommentItemProps {
  authorName: string;
  /** 이미 가공된 표시용 문자열 (예: "2분 전"). 화면이 시간 계산을 하지 않는다. */
  timeAgo: string;
  content: string;
  avatarUrl?: string | null;
  /** 주면 "답글" 버튼이 붙는다. 대댓글을 쓰지 않는 게시판은 생략한다. */
  onReplyPress?: () => void;
  /** 주면 "삭제" 버튼이 붙는다. 내 댓글일 때만 넘긴다. */
  onDeletePress?: () => void;
}

// 댓글 한 줄. 댓글에 작성자·시간이 있다는 걸 아는 조합 컴포넌트라 base가 아니라 composed에 둔다.
// 큐티나눔·기도요청 등 다른 게시판에서도 같은 모양을 쓸 예정이라 처음부터 공용으로 둔다.
export function CommentItem({
  authorName,
  timeAgo,
  content,
  avatarUrl,
  onReplyPress,
  onDeletePress,
}: CommentItemProps) {
  const { t } = useTranslation();
  return (
    <View className="flex-row gap-2 py-2">
      <Avatar imageUrl={avatarUrl} size={36} />
      <View className="flex-1 pt-1.5">
        <View className="flex-row items-center gap-2">
          <Text className="text-body-main text-text-normal">{authorName}</Text>
          <Text className="text-body-small text-text-alternative">{timeAgo}</Text>
        </View>
        <Text className="mt-1 text-body-medium text-text-neutral">{content}</Text>
        {/* 답글·삭제는 콜백을 준 게시판에서만 나온다 — 시안에 버튼이 없는 화면은 그대로 유지된다. */}
        {(onReplyPress || onDeletePress) && (
          <View className="mt-1 flex-row gap-3">
            {onReplyPress && (
              <Pressable onPress={onReplyPress} hitSlop={8}>
                <Text className="text-body-small text-text-alternative">{t("답글")}</Text>
              </Pressable>
            )}
            {onDeletePress && (
              <Pressable onPress={onDeletePress} hitSlop={8}>
                <Text className="text-body-small text-text-alternative">{t("삭제")}</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
