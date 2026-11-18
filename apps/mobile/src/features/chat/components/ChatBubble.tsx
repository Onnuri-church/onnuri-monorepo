import type { ChatMessageInfo } from "@onnuri/shared";
import { useTranslation } from "react-i18next";
import { Linking, Pressable, Text, View } from "react-native";

import { Avatar } from "../../../shared/components/base/Avatar";
import { Icon } from "../../../shared/components/base/Icon";
import { toTimeAgo } from "../../../shared/utils/date";
import type { ChatKind } from "../api";
import { MentionText } from "./MentionText";
import { PhotoGrid } from "./PhotoGrid";
import { PollCard } from "./PollCard";

interface ChatBubbleProps {
  message: ChatMessageInfo;
  /** 투표 카드가 서버에 요청할 때 쓰는 방 종류·id */
  kind: ChatKind;
  roomId: string;
  onLongPress: () => void;
  onImagePress: (index: number) => void;
  onReactionPress: (emoji: string) => void;
  /** 보내는 중인 첨부 메시지 — 카카오톡처럼 말풍선 위에 진행 상태를, 실패하면 왼쪽에 ↻·× 버튼을 그린다 */
  upload?: PendingUpload;
}

export interface PendingUpload {
  /** 지금까지 보낸 바이트와 전체 바이트 (아직 모르면 0) */
  loaded: number;
  total: number;
  /** 몇 번째 파일을 올리는 중인지 (1부터) / 전체 파일 수 */
  current: number;
  count: number;
  failed: boolean;
  onRetry: () => void;
  onCancel: () => void;
}

// 업로드 진행 표기 — 카카오톡처럼 소수 둘째 자리까지 ("0.00/161.84KB")
function formatProgress(loaded: number, total: number): string {
  const mb = total >= 1024 * 1024;
  const unit = mb ? 1024 * 1024 : 1024;
  return `${(loaded / unit).toFixed(2)}/${(total / unit).toFixed(2)}${mb ? "MB" : "KB"}`;
}

// 바이트 → "2.4MB" 같은 짧은 표기
function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

// 단톡방 메시지 한 건 — 내 메시지는 오른쪽, 남의 메시지는 왼쪽(프로필·이름 포함).
// 답장 인용, 사진, 본문(언급 강조), 이모지 반응 줄이 쌓인다. 길게 누르면 메뉴가 열린다.
export function ChatBubble({
  message,
  kind,
  roomId,
  onLongPress,
  onImagePress,
  onReactionPress,
  upload,
}: ChatBubbleProps) {
  const { t } = useTranslation();
  const mine = message.isMine;

  // 입장·퇴장 안내는 말풍선 없이 가운데 회색 글씨로 (SCRUM-217)
  if (message.isSystem) {
    return (
      <View className="items-center py-1">
        <Text className="rounded-full bg-background-muted px-3 py-1 text-caption-main text-text-alternative">
          {message.content}
        </Text>
      </View>
    );
  }

  // 아직 안 읽은 멤버 수 — 카카오톡의 "1"처럼 다 읽으면 사라진다 (SCRUM-219)
  const unread =
    message.unreadCount > 0 ? (
      <Text className="text-caption-main font-semibold text-semantic-warning">
        {message.unreadCount}
      </Text>
    ) : null;

  // 사진은 말풍선 밖에 카카오톡처럼 사진만 묶어 그리고, 글·답장·동영상·파일만 말풍선에 넣는다.
  const hasText =
    message.isNotice ||
    message.replyTo !== null ||
    message.videoUrls.length + message.files.length > 0 ||
    message.content !== "";
  const textBubble = !hasText ? null : (
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
        <View
          className={
            mine ? "border-l-2 border-text-onImage pl-2" : "border-l-2 border-primary-normal pl-2"
          }
        >
          <Text
            className={
              mine ? "text-caption-main text-text-onImage" : "text-caption-main text-text-neutral"
            }
            numberOfLines={1}
          >
            {message.replyTo.authorName}
          </Text>
          <Text
            className={
              mine
                ? "text-caption-main text-text-onImage"
                : "text-caption-main text-text-alternative"
            }
            numberOfLines={2}
          >
            {message.replyTo.content || t("사진")}
          </Text>
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
          className={
            mine ? "text-body-medium text-text-onImage" : "text-body-medium text-text-normal"
          }
          mentionClassName={
            mine
              ? "font-pretendard-semibold underline"
              : "font-pretendard-semibold text-primary-normal"
          }
        />
      )}
    </Pressable>
  );
  const photos =
    message.imageUrls.length > 0 ? (
      <PhotoGrid urls={message.imageUrls} onPress={onImagePress} onLongPress={onLongPress} />
    ) : null;

  // 보내는 중 — 말풍선을 어둡게 덮고 가운데에 사진 아이콘과 진행 상태를 띄운다.
  // 여러 개면 "1/2"처럼 몇 번째인지, 하나면 "0.00/161.84KB"처럼 보낸 용량을 보여준다.
  const hasAttachment =
    message.imageUrls.length + message.videoUrls.length + message.files.length > 0;
  const overlay =
    upload && hasAttachment ? (
      <View
        pointerEvents="none"
        className="absolute inset-0 items-center justify-center gap-1.5 rounded-2xl"
        style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
      >
        <View
          className="h-11 w-11 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
        >
          <Icon name={upload.failed ? "warning" : "image"} size={22} color="#FFFFFF" />
        </View>
        {!upload.failed && (upload.count > 1 || upload.total > 0) && (
          <Text className="text-caption-main text-text-onImage">
            {upload.count > 1
              ? `${upload.current}/${upload.count}`
              : formatProgress(upload.loaded, upload.total)}
          </Text>
        )}
      </View>
    ) : null;

  // 진행 상태는 사진 묶음 위에 (사진이 없으면 동영상·파일 말풍선 위에) 덮는다.
  const body = message.poll ? (
    <PollCard poll={message.poll} kind={kind} id={roomId} onLongPress={onLongPress} />
  ) : (
    <View className={mine ? "items-end gap-1" : "items-start gap-1"}>
      {photos && (
        <View>
          {photos}
          {overlay}
        </View>
      )}
      {textBubble && (
        <View className="max-w-full">
          {textBubble}
          {!photos && overlay}
        </View>
      )}
    </View>
  );

  // 실패하면 말풍선 왼쪽에 다시 보내기(↻)·취소(×) — 카카오톡과 같은 자리
  const retry = upload?.failed ? (
    <View className="mr-1.5 flex-row items-center self-end rounded-full bg-background-normal px-1 shadow-card">
      <Pressable hitSlop={6} onPress={upload.onRetry} className="px-2 py-1">
        <Text className="text-body-main text-text-normal">↻</Text>
      </Pressable>
      <Pressable hitSlop={6} onPress={upload.onCancel} className="px-2 py-1">
        <Text className="text-body-main text-semantic-danger">✕</Text>
      </Pressable>
    </View>
  ) : null;

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
          <View className="flex-row">
            {retry}
            {body}
          </View>
          {reactions}
          <View className="mt-1 flex-row items-center gap-1.5">
            {unread}
            <Text className="text-caption-main text-text-alternative">
              {toTimeAgo(message.createdAt)}
            </Text>
          </View>
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
        <View className="mt-1 flex-row items-center gap-1.5">
          <Text className="text-caption-main text-text-alternative">
            {toTimeAgo(message.createdAt)}
          </Text>
          {unread}
        </View>
      </View>
    </View>
  );
}
