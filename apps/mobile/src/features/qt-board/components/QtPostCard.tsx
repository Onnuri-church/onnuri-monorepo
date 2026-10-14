import { useRef } from "react";
import { Pressable, Text, View } from "react-native";
import {FavoriteButton} from "../../../shared/components/base/FavoriteButton";
import { Icon } from "../../../shared/components/base/Icon";
import { colors } from "../../../shared/theme/tokens";
import { Avatar } from "../../../shared/components/base/Avatar";


export interface QtPost {
  id: string;
  author: string;
  date: string;
  title: string;
  description: string;
  favorite: number;
  // 내가 좋아요를 눌렀는지. 하트를 채운 상태로 그릴지 정한다.
  favorited?: boolean;
}

interface QtPostCardProps {
  post: QtPost;
  onPress?: () => void;
  // 카드 이동과 좋아요는 서로 다른 동작이라 핸들러를 따로 받는다.
  onFavoritePress?: () => void;
  // 관리자 전용 ⋮ — 안 주면 버튼을 그리지 않는다. 메뉴를 붙일 위치(⋮ 버튼의 화면 좌표)를 함께 넘긴다.
  onMenuPress?: (anchor: { x: number; y: number; width: number; height: number }) => void;
}

export function QtPostCard({ post, onPress, onFavoritePress, onMenuPress }: QtPostCardProps) {
  const menuButtonRef = useRef<View>(null);
  const handleMenuPress = () => {
    menuButtonRef.current?.measureInWindow((x, y, width, height) =>
      onMenuPress?.({ x, y, width, height }),
    );
  };

  return (
    <Pressable className="p-6 rounded-3xl shadow-card" onPress={onPress}>
      <View className="flex-row items-center gap-3">
        {/* 목록 응답에 작성자 사진이 없어서 기본 프로필 이미지로 둔다. */}
        <Avatar size={40} />
        <View className="flex-1">
          <Text className="text-label-medium text-text-normal">{post.author}</Text>
          <Text className="text-body-small text-text-alternative">{post.date}</Text>
        </View>
        {onMenuPress && (
          <Pressable ref={menuButtonRef} onPress={handleMenuPress} hitSlop={10}>
            <Icon name="more" size={24} color={colors.icon.normal} />
          </Pressable>
        )}
      </View>
      <Text className="mt-4 text-heading-main text-text-normal">{post.title}</Text>
      <Text className="mt-2 text-body-medium text-text-neutral" numberOfLines={2}>
        {post.description}
      </Text>
        <FavoriteButton className="justify-end mt-1" count={post.favorite} favorited={post.favorited} onPress={onFavoritePress}/>
    </Pressable>
  );
}
