import { type RouteProp, useRoute } from "@react-navigation/native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "../../shared/components/base/Avatar";
import { Icon } from "../../shared/components/base/Icon";
import type { RootStackParamList } from "../../shared/types/navigation";
import { toChatDate, toChatTime } from "../../shared/utils/date";
import { useChatRoom } from "./api";
import { ChatImageViewer } from "./components/ChatImageViewer";
import { MentionText } from "./components/MentionText";

// 공지 상세 (SCRUM-252) — 채팅방 상단 공지 줄이나 "공지가 등록되었습니다 · 상세보기"를 누르면 온다.
// 공지로 올린 메시지 한 건을 크게 보여준다: 글이면 글, 사진이면 사진, 파일·동영상이면 여는 줄.
// 방을 이미 받아 둔 값에서 찾는다 (상단 공지 또는 최근 대화) — 오래돼서 없으면 안내만 한다.
export function ChatNoticeDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { kind, id, messageId } =
    useRoute<RouteProp<RootStackParamList, "ChatNoticeDetail">>().params;
  const { data: room } = useChatRoom(kind, id, false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const message =
    room?.notice?.id === messageId
      ? room.notice
      : room?.messages.find((item) => item.id === messageId);

  if (!message) {
    return (
      <View className="flex-1 items-center justify-center bg-background-normal px-8">
        <Text className="text-center text-body-medium text-text-alternative">
          {room ? t("공지를 찾을 수 없어요. 오래됐거나 삭제된 메시지예요.") : ""}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-normal">
      <ScrollView
        contentContainerClassName="gap-4 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
      >
        <View className="flex-row items-center gap-3">
          <Avatar imageUrl={message.authorAvatarUrl} size={40} />
          <View className="flex-1">
            <Text className="text-body-main text-text-normal">{message.authorName}</Text>
            <Text className="text-caption-main text-text-alternative">
              {toChatDate(message.createdAt)} {toChatTime(message.createdAt)} · {t("공지")}
            </Text>
          </View>
        </View>

        {message.content !== "" && (
          <MentionText
            message={message}
            className="text-body-medium text-text-normal"
            mentionClassName="font-pretendard-semibold text-primary-normal"
          />
        )}

        {message.imageUrls.map((url, index) => (
          <Pressable key={url} onPress={() => setViewerIndex(index)} className="active:opacity-80">
            <Image
              source={{ uri: url }}
              className="w-full rounded-2xl bg-background-muted"
              style={{ aspectRatio: 1 }}
              resizeMode="cover"
            />
          </Pressable>
        ))}

        {message.videoUrls.map((url, index) => (
          <Pressable
            key={`video-${index}`}
            onPress={() => void Linking.openURL(url)}
            className="h-14 flex-row items-center gap-3 rounded-xl bg-background-muted px-4 active:opacity-70"
          >
            <Icon name="play" size={22} />
            <Text className="text-body-medium text-text-normal">{t("동영상 보기")}</Text>
          </Pressable>
        ))}

        {message.files.map((file, index) => (
          <Pressable
            key={`file-${index}`}
            onPress={() => void Linking.openURL(file.url)}
            className="h-14 flex-row items-center gap-3 rounded-xl bg-background-muted px-4 active:opacity-70"
          >
            <Icon name="note" size={22} />
            <Text className="flex-1 text-body-medium text-text-normal" numberOfLines={1}>
              {file.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ChatImageViewer
        urls={message.imageUrls}
        startIndex={viewerIndex}
        onClose={() => setViewerIndex(null)}
      />
    </View>
  );
}
