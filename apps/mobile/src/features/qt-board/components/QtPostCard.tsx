import { Pressable, Text, View } from "react-native";
import { Icon } from "../../../shared/components/base/Icon";
import { colors } from "../../../shared/theme/tokens";


export interface QtPost {
  id: string;
  author: string;
  date: string;
  title: string;
  description: string;
  favorite: number;
}

interface QtPostCardProps {
  post: QtPost;
  onPress?: () => void;
}

export function QtPostCard({ post, onPress }: QtPostCardProps) {
  return (
    <Pressable className="p-6 rounded-3xl shadow-card" onPress={onPress}>
      <View className="flex-row items-center gap-3">
        {/* 프로필 이미지는 아직 시안에 플레이스홀더만 있어서 회색 원으로 둔다. */}
        <View className="h-10 w-10 rounded-full bg-text-assistive" />
        <View>
          <Text className="text-label-medium">{post.author}</Text>
          <Text className="text-caption-medium text-text-alternative">{post.date}</Text>
        </View>
      </View>
      <Text className="mt-4 text-heading-main">{post.title}</Text>
      <Text className="mt-2 text-body-medium text-text-neutral" numberOfLines={2}>
        {post.description}
      </Text>
      <View className="mt-1 flex-row items-center justify-end gap-1">
        <Pressable className="w-7 h-7 flex items-center justify-center border border-semantic-info rounded-full">
          <Icon name="favorite-light" color={colors.icon.strongest} size={18}/>
        </Pressable>
        <Text className="text-body-regular text-text-normal">{post.favorite}</Text>
      </View>
    </Pressable>
  );
}
