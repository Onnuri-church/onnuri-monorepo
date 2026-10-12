import type { ChatMessageInfo } from "@onnuri/shared";
import { useTranslation } from "react-i18next";
import { Image, Linking, Pressable, Text, View } from "react-native";

import { Avatar } from "../../../shared/components/base/Avatar";
import { Icon } from "../../../shared/components/base/Icon";
import { toTimeAgo } from "../../../shared/utils/date";
import { MentionText } from "./MentionText";

interface ChatBubbleProps {
  message: ChatMessageInfo;
  onLongPress: () => void;
  onImagePress: (index: number) => void;
  onReactionPress: (emoji: string) => void;
}

const IMAGE_SIZE = 140;

// 바이트 → "2.4MB" 같은 짧은 표기
function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

// 단톡방 메시지 한 건 — 내 메시지는 오른쪽, 남의 메시지는 왼쪽(프로필·이름 포함).
// 답장 인용, 사진, 본문(언급 강조), 이모지 반응 줄이 쌓인다. 길게 누르면 메뉴가 열린다.
export function ChatBubble({ message, onLongPress, onImagePress, onReactionPress }: ChatBubbleProps) {
  const { t } = useTranslation();
  const mine = message.isMine;

  const body = (
    <Pressable
      onLongPress={onLongPress}
      className={
        mine
          ? "max-w-full gap-2 rounded-2xl bg-primary-normal px-3 py-2"
          : "max-w-full gap-2 rounded-2xl bg-background-muted px-3 py-2"
      }
    >
      {message.isNotice && (
        <Text
          className={
            mine ? "text-caption-main text-text-onImage" : "text-caption-main text-semantic-warning"
          }
        >
          {t("공지")}
        </Text>
      )}
      {message.replyTo && (
        <View className={mine ? "border-l-2 border-text-onImage pl-2" : "border-l-2 border-primary-normal pl-2"}>
          <Text
            className={mine ? "text-caption-main text-text-onImage" : "text-caption-main text-text-neutral"}
            numberOfLines={1}
          >
            {message.replyTo.authorName}
          </Text>
          <Text
            className={mine ? "text-caption-main text-text-onImage" : "text-caption-main text-text-alternative"}
            numberOfLines={2}
          >
            {message.replyTo.content || t("사진")}
          </Text>
        </View>
      )}
      {message.imageUrls.length > 0 && (
        <View className="flex-row flex-wrap gap-1">
          {message.imageUrls.map((url, index) => (
            <Pressable
              key={`${index}-${url}`}
              onPress={() => onImagePress(index)}
              onLongPress={onLongPress}
            >
              <Image
                source={{ uri: url }}
                style={{ width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: 12 }}
                resizeMode="cover"
              />
            </Pressable>
          ))}
        </View>
      )}
      {/* 동영상 — 앱 안 플레이어 없이 기기의 기본 플레이어로 연다 (네이티브 모듈 추가 없이). */}
      {message.videoUrls.map((url, index) => (
        <Pressable
          key={`video-${index}-${url}`}
          onPress={() => void Linking.openURL(url)}
          onLongPress={onLongPress}
          className="h-20 w-40 flex-row items-center gap-2 rounded-xl bg-background-dark px-3"
        >
          <Icon name="play" size={28} color="#FFFFFF" />
          <Text className="text-body-small text-text-onImage">{t("동영상 보기")}</Text>
        </Pressable>
      ))}
      {message.files.map((file, index) => (
        <Pressable
          key={`file-${index}-${file.url}`}
          onPress={() => void Linking.openURL(file.url)}
          onLongPress={onLongPress}
          className="max-w-[220px] flex-row items-center gap-2 rounded-xl bg-background-normal px-3 py-2"
        >
          <Icon name="note" size={24} />
          <View className="flex-1">
            <Text className="text-body-small text-text-normal" numberOfLines={1}>
              {file.name}
            </Text>
            <Text className="text-caption-main text-text-alternative">{formatSize(file.size)}</Text>
          </View>
        </Pressable>
      ))}
      {message.content !== "" && (
        <MentionText
          message={message}
          className={mine ? "text-body-medium text-text-onImage" : "text-body-medium text-text-normal"}
          mentionClassName={mine ? "font-pretendard-semibold underline" : "font-pretendard-semibold text-primary-normal"}
        />
      )}
    </Pressable>
  );

  const reactions = message.reactions.length > 0 && (
    <View className="mt-1 flex-row flex-wrap gap-1">
      {message.reactions.map((reaction) => (
        <Pressable
          key={reaction.emoji}
          onPress={() => onReactionPress(reaction.emoji)}
          className={
            reaction.reactedByMe
              ? "flex-row items-center gap-1 rounded-full border border-primary-normal bg-background-alternative px-2 py-0.5"
              : "flex-row items-center gap-1 rounded-full border border-background-assistive px-2 py-0.5"
          }
        >
          <Text className="text-body-small">{reaction.emoji}</Text>
          <Text className="text-caption-main text-text-neutral">{reaction.count}</Text>
        </Pressable>
      ))}
    </View>
  );

  if (mine) {
    return (
      <View className="items-end">
        <View className="max-w-[78%] items-end">
          {body}
          {reactions}
          <Text className="mt-1 text-caption-main text-text-alternative">
            {toTimeAgo(message.createdAt)}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-row items-start gap-2">
      <Avatar imageUrl={message.authorAvatarUrl} size={36} />
      <View className="max-w-[78%] items-start">
        <Text className="text-body-small text-text-neutral">{message.authorName}</Text>
        <View className="mt-1">{body}</View>
        {reactions}
        <Text className="mt-1 text-caption-main text-text-alternative">
          {toTimeAgo(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}
