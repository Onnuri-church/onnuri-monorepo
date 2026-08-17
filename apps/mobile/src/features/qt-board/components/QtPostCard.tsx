import { Pressable, Text, View } from "react-native";
import {FavoriteButton} from "../../../shared/components/base/FavoriteButton";


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
  // 카드 이동과 좋아요는 서로 다른 동작이라 핸들러를 따로 받는다.
  onFavoritePress?: () => void;
}

export function QtPostCard({ post, onPress, onFavoritePress }: QtPostCardProps) {
  return (
    <Pressable className="p-6 rounded-3xl shadow-card" onPress={onPress}>
      <View className="flex-row items-center gap-3">
        {/* 프로필 이미지는 아직 시안에 플레이스홀더만 있어서 회색 원으로 둔다. */}
        <View className="h-10 w-10 rounded-full bg-text-assistive" />
        <View>
          <Text className="text-label-medium">{post.author}</Text>
          <Text className="text-body-small text-text-alternative">{post.date}</Text>
        </View>
      </View>
      <Text className="mt-4 text-heading-main">{post.title}</Text>
      <Text className="mt-2 text-body-medium text-text-neutral" numberOfLines={2}>
        {post.description}
      </Text>
        <FavoriteButton className="justify-end mt-1" count={post.favorite} onPress={onFavoritePress}/>
    </Pressable>
  );
}
