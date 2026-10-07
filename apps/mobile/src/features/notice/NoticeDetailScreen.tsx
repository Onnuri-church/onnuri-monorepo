import { useRoute, type RouteProp } from "@react-navigation/native";
import { useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { RootStackParamList } from "../../shared/types/navigation";
import { toNoticeDateLabel, useNotices } from "./api";

// 공지 상세 — 목록이 전체 필드를 내려주므로 같은 캐시에서 찾는다 (api.ts 계약).
export function NoticeDetailScreen() {
  const insets = useSafeAreaInsets();
  const { params } = useRoute<RouteProp<RootStackParamList, "NoticeDetail">>();
  const { data: notices, isLoading } = useNotices();
  const notice = (notices ?? []).find((item) => item.id === params.id);

  // 포스터 비율이 제각각이라 불러온 뒤 실제 크기에서 받아온다 (ImagePager와 같은 방식).
  const [imageRatio, setImageRatio] = useState<number | undefined>(undefined);

  if (!notice) {
    return (
      <View className="flex-1 items-center justify-center bg-background-normal">
        <Text className="text-body-medium text-text-alternative">
          {isLoading ? "공지를 불러오고 있어요." : "공지를 찾을 수 없어요."}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background-normal"
      contentContainerClassName="px-5 pt-6"
      contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
    >
      <Text className="text-heading-medium text-text-normal">{notice.title}</Text>
      <Text className="mt-2 text-body-small text-text-alternative">
        {toNoticeDateLabel(notice.createdAt)}
      </Text>

      <View className="mt-4 h-px bg-background-assistive" />

      {notice.imageUrl !== null && (
        <Image
          source={{ uri: notice.imageUrl }}
          className="mt-5 w-full rounded-2.5"
          style={{ aspectRatio: imageRatio }}
          onLoad={(event) => {
            const { width, height } = event.nativeEvent.source;
            setImageRatio(width / height);
          }}
        />
      )}

      {notice.content !== null && (
        <Text className="mt-5 text-body-medium text-text-neutral">{notice.content}</Text>
      )}
    </ScrollView>
  );
}
