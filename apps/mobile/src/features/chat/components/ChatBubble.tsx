import type { ChatMessageInfo } from "@onnuri/shared";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Linking, Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { Avatar } from "../../../shared/components/base/Avatar";
import { Icon } from "../../../shared/components/base/Icon";
import { toChatTime } from "../../../shared/utils/date";
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
  /** 대화 검색어 — 본문에서 찾은 글자만 칠한다 (SCRUM-235) */
  highlight?: string;
  /** 지금 가리키는 검색 결과인지 (더 진하게) */
  highlightActive?: boolean;
  /** 시각을 달지 — 같은 사람이 같은 분에 연달아 보낸 메시지는 마지막에만 단다 (기본 true) */
  showTime?: boolean;
  /**
   * 바로 앞 메시지와 한 묶음인지 — 같은 사람이 같은 분에 이어서 보낸 메시지 (SCRUM-273).
   * 묶음의 둘째부터는 프로필 사진과 이름을 다시 그리지 않는다 (카카오톡처럼).
   */
  continued?: boolean;
  /** 답장 인용을 눌렀을 때 — 원래 메시지로 이동한다 (SCRUM-254) */
  onReplyPress?: (messageId: string) => void;
  /** "공지가 등록되었습니다" 안내의 상세보기를 눌렀을 때 (SCRUM-252) */
  onNoticePress?: (messageId: string) => void;
  /** 답장에서 찾아온 메시지 — 위아래로 잠깐 흔든다 (SCRUM-254) */
  shake?: boolean;
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
  onReplyPress,
  onNoticePress,
  shake = false,
  showTime = true,
  continued = false,
  highlight,
  highlightActive = false,
}: ChatBubbleProps) {
  const { t } = useTranslation();
  const mine = message.isMine;

  // 답장에서 찾아왔을 때 — 글·사진·파일만 위아래로 살짝 흔들다 멈춘다 (카카오톡처럼).
  const offset = useSharedValue(0);
  useEffect(() => {
    if (!shake) return;
    const step = (value: number) => withTiming(value, { duration: 70 });
    offset.value = withSequence(step(-7), step(7), step(-5), step(5), step(-3), step(0));
  }, [shake, offset]);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));

  // 입장·퇴장 안내는 말풍선 없이 가운데 회색 글씨로 (SCRUM-217).
  // 공지 등록 안내는 가리키는 공지 메시지가 있어서 아래에 "상세보기"가 붙는다 (SCRUM-252).
  if (message.isSystem) {
    const noticeId = message.replyTo?.id;
    return (
      <View className="items-center py-1">
        <View className="items-center rounded-2xl bg-background-muted px-3 py-1">
          <Text className="text-caption-main text-text-alternative">{message.content}</Text>
          {noticeId && onNoticePress && (
            <Pressable hitSlop={8} onPress={() => onNoticePress(noticeId)}>
              <Text className="text-caption-main text-text-neutral underline">{t("상세보기")}</Text>
            </Pressable>
          )}
        </View>
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
  // 공지로 등록된 메시지에 따로 표시를 달지 않는다 — 상단 공지 줄과 등록 안내로 충분하다 (SCRUM-252).
  const hasText =
    message.replyTo !== null ||
    message.videoUrls.length + message.files.length > 0 ||
    message.content !== "";
  const textBubble = !hasText ? null : (
    <Pressable
      onLongPress={onLongPress}
      className={
        mine
          ? "max-w-full gap-2 rounded-2xl bg-primary-normal px-3 py-2"
          : "max-w-full gap-2 rounded-2xl bg-background-normal px-3 py-2"
      }
    >
      {message.replyTo && (
        // 누르면 원래 메시지로 이동한다 (SCRUM-254)
        <Pressable
          onPress={() => message.replyTo && onReplyPress?.(message.replyTo.id)}
          onLongPress={onLongPress}
          className={
            mine
              ? "border-l-2 border-text-onImage pl-2 active:opacity-60"
              : "border-l-2 border-primary-normal pl-2 active:opacity-60"
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
        </Pressable>
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
          highlight={highlight}
          highlightActive={highlightActive}
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
  const content = message.poll ? (
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

  const body = <Animated.View style={shakeStyle}>{content}</Animated.View>;

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
          {/* 시각도 안 읽은 수도 없으면 줄 자체를 그리지 않는다 — 빈 줄이 묶음 사이를 벌린다 (SCRUM-273) */}
          {(showTime || unread) && (
            <View className="mt-1 flex-row items-center gap-1.5">
              {unread}
              {showTime && (
                <Text className="text-caption-main text-text-alternative">
                  {toChatTime(message.createdAt)}
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View className="flex-row items-start gap-2">
      {/* 묶음의 둘째부터는 사진 자리만 비워 말풍선 줄을 맞추고, 이름도 다시 쓰지 않는다 (SCRUM-273) */}
      {continued ? (
        <View style={{ width: 36 }} />
      ) : (
        <Avatar imageUrl={message.authorAvatarUrl} size={36} />
      )}
      <View className="max-w-[78%] items-start">
        {!continued && (
          <Text className="text-body-small text-text-neutral">{message.authorName}</Text>
        )}
        <View className={continued ? undefined : "mt-1"}>{body}</View>
        {reactions}
        {(showTime || unread) && (
          <View className="mt-1 flex-row items-center gap-1.5">
            {showTime && (
              <Text className="text-caption-main text-text-alternative">
                {toChatTime(message.createdAt)}
              </Text>
            )}
            {unread}
          </View>
        )}
      </View>
    </View>
  );
}
