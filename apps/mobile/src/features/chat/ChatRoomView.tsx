import type { ChatMessageInfo, SendChatMessageRequest } from "@onnuri/shared";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Image, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { uploadAttachment, uploadImageWithProgress } from "../../shared/api/upload";
import { AppearIn } from "../../shared/components/base/AppearIn";
import { useNewItems } from "../../shared/hooks/useNewItems";
import { useAuthStore } from "../../shared/store/useAuthStore";
import type { RootStackParamList } from "../../shared/types/navigation";
import { Icon } from "../../shared/components/base/Icon";
import { useKeyboardHeight } from "../../shared/hooks/useKeyboardHeight";
import { colors } from "../../shared/theme/tokens";
import { useThemeColors } from "../../shared/theme/useThemeColors";
import {
  markChatRead,
  useChatRoom,
  useDeleteChatMessage,
  useSendChatMessage,
  useSetChatNotice,
  useToggleChatReaction,
  type ChatKind,
} from "./api";
import { ChatBubble } from "./components/ChatBubble";
import { AttachmentSheet } from "./components/AttachmentSheet";
import { ChatImageViewer } from "./components/ChatImageViewer";
import { MessageActionModal } from "./components/MessageActionModal";
import { MentionText } from "./components/MentionText";
import { useBlockConfirm } from "../block/useBlockConfirm";
import { useBlockedUserIds } from "../block/api";
import { useReport } from "../report/useReport";

const MAX_IMAGES = 5;
const MAX_VIDEOS = 3;
const MAX_FILES = 3;
const MB = 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * MB;
const MAX_FILE_BYTES = 10 * MB;

interface PickedFile {
  uri: string;
  name: string;
  size: number;
  mimeType: string | null;
}

interface PickedVideo {
  uri: string;
  name: string;
  mimeType: string | null;
}

interface ChatRoomViewProps {
  kind: ChatKind;
  id: string;
}

// 팀·셀 단톡방 본체. 대화, 사진 보내기, 답장, 언급(@), 이모지 반응, 공지(상단 고정)를 한 화면에서
// 처리한다. 화면이 열려 있는 동안 몇 초마다 새 메시지를 받아오고, 새 메시지가 오면 맨 아래로 따라간다.
export function ChatRoomView({ kind, id }: ChatRoomViewProps) {
  const { t } = useTranslation();
  // 차단 (SCRUM-198) — 차단한 사람의 메시지는 내용 대신 한 줄 안내로 접는다. 대화 흐름(답장 등)이
  // 끊기지 않게 서버에서 빼지 않고 앱에서 가린다.
  const blockedIds = useBlockedUserIds();
  const { requestBlock, dialog: blockDialog, canBlock } = useBlockConfirm();
  // 남의 글·댓글 "신고" (SCRUM-199)
  const { openReport, sheet: reportSheet } = useReport();
  const themeColors = useThemeColors();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const focused = useIsFocused();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { data: room } = useChatRoom(kind, id, focused);
  // 방을 연 뒤 새로 온 말풍선만 "톡" 하고 나타나게 한다 (SCRUM-215). 내가 보낸 건 보내는 중 말풍선이
  // 먼저 나타났으니 진짜로 바뀔 때는 효과를 주지 않는다.
  const { isNew, markSeen } = useNewItems(room?.messages.map((message) => message.id));
  const send = useSendChatMessage(kind, id, (message) => markSeen(message.id));
  const setNotice = useSetChatNotice(kind, id);
  const react = useToggleChatReaction(kind, id);
  const remove = useDeleteChatMessage(kind, id);

  const [draft, setDraft] = useState("");
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [videos, setVideos] = useState<PickedVideo[]>([]);
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [attachmentSheetOpen, setAttachmentSheetOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessageInfo | null>(null);
  const [mentioned, setMentioned] = useState<{ id: string; name: string }[]>([]);
  const [asNotice, setAsNotice] = useState(false);
  // 글만 있는 메시지는 보내는 즉시 흐리게 먼저 그린다 (SCRUM-212) — 서버가 받으면 진짜 메시지로 바뀌고,
  // 실패하면 그 자리에 다시 보내기/삭제를 띄운다. 첨부가 있는 메시지는 업로드가 끝나야 해서 기존대로 기다린다.
  const [pending, setPending] = useState<PendingMessage[]>([]);
  // 연달아 보낸 메시지가 순서대로 저장되게 한 줄로 세워 보낸다.
  const sendQueue = useRef<Promise<unknown>>(Promise.resolve());
  const me = useAuthStore((state) =>
    state.session.status === "authenticated" ? state.session.user : null,
  );
  const [actionTarget, setActionTarget] = useState<ChatMessageInfo | null>(null);
  const [viewer, setViewer] = useState<{ urls: string[]; index: number } | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const lastCount = useRef(0);
  const messages = room?.messages ?? [];

  // 읽음 표시 — 방이 열려 있는 동안 가장 최근 메시지가 바뀔 때마다 서버에 알린다. 알린 뒤 목록·아이콘의
  // 안 읽은 표시를 다시 받아 빨간 점이 사라지게 한다.
  const queryClient = useQueryClient();
  const latestMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;
  useEffect(() => {
    if (!focused || !latestMessageId) return;
    markChatRead(kind, id)
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ["chat-unread"] });
        void queryClient.invalidateQueries({ queryKey: ["chat-rooms"] });
        void queryClient.invalidateQueries({ queryKey: ["leader-rooms"] });
      })
      .catch(() => undefined);
  }, [focused, latestMessageId, kind, id, queryClient]);

  // "@" 뒤에 이름 일부를 치는 중이면 방 멤버 후보를 보여준다.
  const mentionQuery = useMemo(() => {
    const match = /@([^\s@]*)$/.exec(draft);
    return match ? match[1] : null;
  }, [draft]);
  const mentionCandidates =
    mentionQuery === null
      ? []
      : (room?.members ?? []).filter((member) => member.name.includes(mentionQuery)).slice(0, 6);

  const handlePickMention = (member: { id: string; name: string }) => {
    setDraft((prev) => prev.replace(/@([^\s@]*)$/, `@${member.name} `));
    setMentioned((prev) => (prev.some((item) => item.id === member.id) ? prev : [...prev, member]));
  };

  // iOS는 시트(Modal)가 다 닫히기 전에 사진·파일 선택창을 띄우면 아무 반응 없이 무시된다.
  // 그래서 시트를 닫고, 닫힘이 끝난 뒤(onDismiss)에 선택창을 연다. onDismiss가 안 오는 경우를 대비해
  // 잠시 뒤에도 한 번 시도하고, 둘 중 먼저 오는 쪽에서 한 번만 실행한다.
  const pendingPickRef = useRef<(() => void) | null>(null);
  const runPendingPick = () => {
    const action = pendingPickRef.current;
    pendingPickRef.current = null;
    action?.();
  };
  const pickAfterSheetClosed = (action: () => Promise<void>) => {
    pendingPickRef.current = () => {
      action().catch(() => {
        Alert.alert(t("열 수 없어요"), t("사진·파일 접근 권한을 확인한 뒤 다시 시도해주세요."));
      });
    };
    setAttachmentSheetOpen(false);
    setTimeout(runPendingPick, Platform.OS === "ios" ? 700 : 0);
  };

  // 앨범에서 사진·동영상을 함께 고른다. 사진은 5장, 동영상은 3개·50MB까지다.
  const handlePickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES + MAX_VIDEOS,
      quality: 0.8,
    });
    if (result.canceled) return;

    const nextPhotos: string[] = [];
    const nextVideos: PickedVideo[] = [];
    let skipped = 0;
    for (const asset of result.assets) {
      if (asset.type === "video") {
        if ((asset.fileSize ?? 0) > MAX_VIDEO_BYTES) {
          skipped += 1;
          continue;
        }
        nextVideos.push({
          uri: asset.uri,
          name: asset.fileName ?? "video.mp4",
          mimeType: asset.mimeType ?? "video/mp4",
        });
      } else {
        nextPhotos.push(asset.uri);
      }
    }
    setPhotoUris((prev) => [...prev, ...nextPhotos].slice(0, MAX_IMAGES));
    setVideos((prev) => [...prev, ...nextVideos].slice(0, MAX_VIDEOS));
    if (skipped > 0) {
      Alert.alert(
        t("동영상은 50MB까지 보낼 수 있어요"),
        t("용량이 큰 동영상 {{count}}개는 제외했어요.", { count: skipped }),
      );
    }
  };

  // 파일(악보·문서)은 expo-document-picker로 고른다. 이 모듈은 앱을 새로 빌드해야 들어 있어서,
  // 아직 반영되지 않은 빌드에서는 오류 대신 안내를 보여준다.
  const handlePickFile = async () => {
    let DocumentPicker: typeof import("expo-document-picker");
    try {
      DocumentPicker = require("expo-document-picker");
    } catch {
      Alert.alert(
        t("앱 업데이트가 필요해요"),
        t("파일 보내기는 앱을 새로 설치한 뒤에 쓸 수 있어요."),
      );
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
      type: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/x-hwp",
        "application/haansofthwp",
        "text/plain",
      ],
    });
    if (result.canceled) return;

    const picked: PickedFile[] = [];
    let skipped = 0;
    for (const asset of result.assets) {
      if ((asset.size ?? 0) > MAX_FILE_BYTES) {
        skipped += 1;
        continue;
      }
      picked.push({
        uri: asset.uri,
        name: asset.name,
        size: asset.size ?? 0,
        mimeType: asset.mimeType ?? null,
      });
    }
    setFiles((prev) => [...prev, ...picked].slice(0, MAX_FILES));
    if (skipped > 0) {
      Alert.alert(
        t("파일은 10MB까지 보낼 수 있어요"),
        t("용량이 큰 파일 {{count}}개는 제외했어요.", { count: skipped }),
      );
    }
  };

  const hasAttachment = photoUris.length + videos.length + files.length > 0;
  const canSend = draft.trim() !== "" || hasAttachment;

  const resetComposer = () => {
    setDraft("");
    setPhotoUris([]);
    setVideos([]);
    setFiles([]);
    setReplyTo(null);
    setMentioned([]);
    setAsNotice(false);
  };

  // 보내는 중 말풍선의 진행률·실패 상태를 바꾼다.
  const patchPending = (localId: string, patch: Partial<PendingMessage>) =>
    setPending((prev) =>
      prev.map((item) => (item.localId === localId ? { ...item, ...patch } : item)),
    );

  // 첨부가 있으면 먼저 올리고(진행률을 말풍선 아래 막대로 보여준다) 올라간 주소로 메시지를 보낸다.
  // 순서가 섞이지 않게 앞 메시지가 끝난 뒤에 다음 것을 보낸다 (카카오톡처럼).
  const deliver = (item: PendingMessage) => {
    const { localId, body, uploads } = item;
    patchPending(localId, { failed: false, error: undefined, progress: uploads ? 0 : undefined });
    sendQueue.current = sendQueue.current.then(async () => {
      try {
        let finalBody = body;
        if (uploads) {
          // 파일마다 보낸 바이트를 모아 전체 진행률을 낸다. 크기를 모르는 파일은 1로 쳐서 막대가 멈추지 않게 한다.
          const loaded: number[] = [];
          const totals: number[] = [];
          const track = (index: number) => (sent: number, total: number) => {
            loaded[index] = sent;
            totals[index] = total > 0 ? total : 1;
            const sum = totals.reduce((acc, value) => acc + (value ?? 0), 0);
            const done = loaded.reduce((acc, value) => acc + (value ?? 0), 0);
            if (sum > 0) patchPending(localId, { progress: Math.min(0.99, done / sum) });
          };
          let index = 0;
          const [imageUrls, videoUrls, uploadedFiles] = await Promise.all([
            Promise.all(uploads.photos.map((uri) => uploadImageWithProgress(uri, track(index++)))),
            Promise.all(
              uploads.videos.map((video) =>
                uploadAttachment(
                  video.uri,
                  { name: video.name, mimeType: video.mimeType },
                  track(index++),
                ),
              ),
            ),
            Promise.all(
              uploads.files.map(async (file) => ({
                url: await uploadAttachment(
                  file.uri,
                  { name: file.name, mimeType: file.mimeType },
                  track(index++),
                ),
                name: file.name,
                size: file.size,
              })),
            ),
          ]);
          finalBody = {
            ...body,
            ...(imageUrls.length > 0 && { imageUrls }),
            ...(videoUrls.length > 0 && { videoUrls }),
            ...(uploadedFiles.length > 0 && { files: uploadedFiles }),
          };
          patchPending(localId, { progress: 1 });
        }
        await send.mutateAsync(finalBody);
        setPending((prev) => prev.filter((value) => value.localId !== localId));
      } catch (error) {
        // 용량·형식 문제 등 서버가 알려준 이유를 말풍선 아래에 보여준다.
        const message = (error as { response?: { data?: { message?: string | string[] } } })
          .response?.data?.message;
        patchPending(localId, {
          failed: true,
          progress: undefined,
          error: Array.isArray(message) ? message[0] : message,
        });
      }
    });
  };

  const handleSend = async () => {
    if (!canSend) return;
    const content = draft.trim();
    // 본문에서 "@이름"이 지워진 언급은 보내지 않는다.
    const mentionedUserIds = mentioned
      .filter((member) => content.includes(`@${member.name}`))
      .map((member) => member.id);

    // 글자든 첨부든 보내기를 누르면 바로 "보내는 중" 말풍선을 띄운다 (SCRUM-226).
    // 첨부는 기기 안의 사진·파일 주소로 먼저 그리고, 업로드는 뒤에서 진행한다.
    const body: SendChatMessageRequest = {
      content,
      ...(replyTo && { replyToId: replyTo.id }),
      ...(mentionedUserIds.length > 0 && { mentionedUserIds }),
      ...(asNotice && { asNotice: true }),
    };
    const uploads = hasAttachment ? { photos: photoUris, videos, files } : undefined;
    const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const message: ChatMessageInfo = {
      id: localId,
      authorId: me?.id ?? "",
      authorName: me?.name ?? "",
      authorAvatarUrl: me?.avatarUrl ?? null,
      content,
      imageUrls: photoUris,
      videoUrls: videos.map((video) => video.uri),
      files: files.map((file) => ({ url: file.uri, name: file.name, size: file.size })),
      replyTo: replyTo
        ? {
            id: replyTo.id,
            authorName: replyTo.authorName,
            content: replyTo.content,
            hasImage: replyTo.imageUrls.length > 0,
          }
        : null,
      poll: null,
      mentions: mentioned.filter((member) => mentionedUserIds.includes(member.id)),
      isNotice: asNotice,
      reactions: [],
      createdAt: new Date().toISOString(),
      isMine: true,
      canDelete: false,
      isSystem: false,
      unreadCount: 0,
    };
    const item: PendingMessage = { localId, body, uploads, message, failed: false };
    setPending((prev) => [...prev, item]);
    resetComposer();
    deliver(item);
  };

  const handleDeletePress = (message: ChatMessageInfo) => {
    Alert.alert(t("메시지를 삭제할까요?"), undefined, [
      { text: t("취소"), style: "cancel" },
      { text: t("삭제"), style: "destructive", onPress: () => remove.mutate(message.id) },
    ]);
  };

  const closeActions = () => setActionTarget(null);

  return (
    <View className="flex-1 bg-background-normal">
      {/* 공지 — 가장 최근에 공지로 등록된 메시지를 상단에 고정해서 보여준다. */}
      {room?.notice && (
        <View className="flex-row items-center gap-2 border-b border-background-assistive bg-background-alternative px-5 py-2">
          <Icon name="announcement" size={18} color={colors.semantic.warning} />
          <View className="flex-1">
            {room.notice.content !== "" ? (
              <MentionText
                message={room.notice}
                className="text-body-small text-text-normal"
                mentionClassName="font-pretendard-semibold text-primary-normal"
              />
            ) : (
              <Text className="text-body-small text-text-normal">{t("사진 공지")}</Text>
            )}
          </View>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        contentContainerClassName="gap-4 px-5 py-4"
        keyboardShouldPersistTaps="handled"
        // 새 메시지가 생겼을 때만 맨 아래로 간다 — 같은 내용을 다시 받을 때는 위치를 건드리지 않는다.
        onContentSizeChange={() => {
          const count = messages.length + pending.length;
          if (count !== lastCount.current) {
            lastCount.current = count;
            scrollRef.current?.scrollToEnd({ animated: true });
          }
        }}
      >
        {messages.length === 0 && (
          <Text className="pt-10 text-center text-body-medium text-text-alternative">
            {t("아직 대화가 없어요. 첫 메시지를 남겨보세요.")}
          </Text>
        )}
        {messages.map((message) =>
          !message.isMine && !message.isSystem && blockedIds.has(message.authorId) ? (
            <Text key={message.id} className="text-body-small text-text-alternative">
              {t("차단한 사용자의 메시지예요")}
            </Text>
          ) : (
            <AppearIn key={message.id} variant="pop" animate={isNew(message.id)}>
              <ChatBubble
                message={message}
                kind={kind}
                roomId={id}
                onLongPress={() => setActionTarget(message)}
                onImagePress={(index) => setViewer({ urls: message.imageUrls, index })}
                onReactionPress={(emoji) => react.mutate({ messageId: message.id, emoji })}
              />
            </AppearIn>
          ),
        )}
        {pending.map((item) => (
          <AppearIn key={item.localId} variant="pop" animate>
            <View className="gap-1">
              {/* 보내는 중에는 흐리게 — 서버가 받으면 이 자리는 진짜 메시지로 바뀐다 */}
              <View style={{ opacity: item.failed ? 1 : 0.5 }}>
                <ChatBubble
                  message={item.message}
                  kind={kind}
                  roomId={id}
                  onLongPress={() => undefined}
                  onImagePress={() => undefined}
                  onReactionPress={() => undefined}
                />
              </View>
              {/* 첨부 업로드 진행률 — 카카오톡처럼 막대가 차오른다 */}
              {!item.failed && item.progress !== undefined && (
                <View className="flex-row items-center justify-end gap-2">
                  <View className="h-1 w-28 overflow-hidden rounded-full bg-background-assistive">
                    <View
                      className="h-full rounded-full bg-primary-normal"
                      style={{ width: `${Math.round(item.progress * 100)}%` }}
                    />
                  </View>
                  <Text className="text-caption-main text-text-alternative">
                    {Math.round(item.progress * 100)}%
                  </Text>
                </View>
              )}
              {item.failed && (
                <View className="flex-row items-center justify-end gap-3">
                  <Text
                    className="flex-shrink text-caption-main text-semantic-danger"
                    numberOfLines={2}
                  >
                    {item.error ? `${t("전송 실패")} · ${item.error}` : t("전송 실패")}
                  </Text>
                  <Pressable hitSlop={8} onPress={() => deliver(item)}>
                    <Text className="text-caption-main text-primary-normal">
                      {t("다시 보내기")}
                    </Text>
                  </Pressable>
                  <Pressable
                    hitSlop={8}
                    onPress={() =>
                      setPending((prev) => prev.filter((value) => value.localId !== item.localId))
                    }
                  >
                    <Text className="text-caption-main text-text-alternative">{t("삭제")}</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </AppearIn>
        ))}
      </ScrollView>

      {/* 언급 후보 */}
      {mentionCandidates.length > 0 && (
        <View className="border-t border-background-assistive bg-background-normal px-5 py-2">
          {mentionCandidates.map((member) => (
            <Pressable
              key={member.id}
              className="h-10 justify-center active:opacity-60"
              onPress={() => handlePickMention(member)}
            >
              <Text className="text-body-main text-text-normal">@{member.name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* 입력 영역 — 답장 대상·첨부 사진 미리보기·입력줄 */}
      <View
        className="border-t border-background-assistive bg-background-normal px-5 pt-2"
        style={{ paddingBottom: (keyboardHeight || insets.bottom) + 8 }}
      >
        {replyTo && (
          <View className="mb-2 flex-row items-center rounded-xl bg-background-muted px-3 py-2">
            <View className="flex-1">
              <Text className="text-caption-main text-text-neutral" numberOfLines={1}>
                {t("{{name}}님에게 답장", { name: replyTo.authorName })}
              </Text>
              <Text className="text-caption-main text-text-alternative" numberOfLines={1}>
                {replyTo.content || t("사진")}
              </Text>
            </View>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
              <Icon name="close-square" size={20} />
            </Pressable>
          </View>
        )}

        {(videos.length > 0 || files.length > 0) && (
          <View className="mb-2 gap-1">
            {videos.map((video) => (
              <View
                key={video.uri}
                className="flex-row items-center rounded-xl bg-background-muted px-3 py-2"
              >
                <Icon name="play" size={18} />
                <Text className="ml-2 flex-1 text-body-small text-text-normal" numberOfLines={1}>
                  {video.name}
                </Text>
                <Pressable
                  onPress={() => setVideos((prev) => prev.filter((item) => item.uri !== video.uri))}
                  hitSlop={8}
                >
                  <Icon name="close-square" size={18} />
                </Pressable>
              </View>
            ))}
            {files.map((file) => (
              <View
                key={file.uri}
                className="flex-row items-center rounded-xl bg-background-muted px-3 py-2"
              >
                <Icon name="note" size={18} />
                <Text className="ml-2 flex-1 text-body-small text-text-normal" numberOfLines={1}>
                  {file.name}
                </Text>
                <Pressable
                  onPress={() => setFiles((prev) => prev.filter((item) => item.uri !== file.uri))}
                  hitSlop={8}
                >
                  <Icon name="close-square" size={18} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {photoUris.length > 0 && (
          <ScrollView horizontal className="mb-2" showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {photoUris.map((uri) => (
                <View key={uri}>
                  <Image source={{ uri }} style={{ width: 64, height: 64, borderRadius: 12 }} />
                  <Pressable
                    className="absolute right-1 top-1"
                    onPress={() => setPhotoUris((prev) => prev.filter((item) => item !== uri))}
                    hitSlop={8}
                  >
                    <Icon name="close-square" size={18} />
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        <View className="flex-row items-center gap-2">
          <Pressable
            className="h-9 w-9 items-center justify-center rounded-full bg-background-alternative active:opacity-60"
            onPress={() => setAttachmentSheetOpen(true)}
          >
            <Icon name="plus" size={20} />
          </Pressable>
          {room?.canNotice && (
            <Pressable
              className={
                asNotice
                  ? "h-9 w-9 items-center justify-center rounded-full bg-primary-normal active:opacity-60"
                  : "h-9 w-9 items-center justify-center rounded-full bg-background-alternative active:opacity-60"
              }
              onPress={() => setAsNotice((prev) => !prev)}
            >
              <Icon
                name="announcement"
                size={18}
                color={asNotice ? colors.icon.disable : colors.icon.normal}
              />
            </Pressable>
          )}
          <TextInput
            className="h-9 flex-1 rounded-full bg-background-muted px-4 text-body-small text-text-normal"
            value={draft}
            onChangeText={setDraft}
            placeholder={asNotice ? t("공지로 보낼 내용을 입력하세요") : t("메시지를 입력하세요")}
            placeholderTextColor={themeColors.text.alternative}
            onSubmitEditing={canSend ? () => void handleSend() : undefined}
            returnKeyType="send"
          />
          <Pressable
            className="h-9 w-9 items-center justify-center rounded-full bg-background-alternative active:opacity-60"
            disabled={!canSend}
            onPress={() => void handleSend()}
          >
            <Icon
              name="send-fill"
              size={20}
              color={canSend ? themeColors.primary.normal : themeColors.icon.normal}
            />
          </Pressable>
        </View>
      </View>

      <AttachmentSheet
        visible={attachmentSheetOpen}
        onClose={() => setAttachmentSheetOpen(false)}
        onDismiss={runPendingPick}
        onPickMedia={() => pickAfterSheetClosed(handlePickMedia)}
        onPickFile={() => pickAfterSheetClosed(handlePickFile)}
        onPickPoll={() => {
          setAttachmentSheetOpen(false);
          navigation.navigate("ChatPollCreate", { kind, id });
        }}
      />

      <MessageActionModal
        message={actionTarget}
        canNotice={room?.canNotice ?? false}
        onClose={closeActions}
        onReact={(emoji) => {
          if (actionTarget) react.mutate({ messageId: actionTarget.id, emoji });
          closeActions();
        }}
        onReply={() => {
          setReplyTo(actionTarget);
          closeActions();
        }}
        onToggleNotice={() => {
          if (actionTarget)
            setNotice.mutate({ messageId: actionTarget.id, on: !actionTarget.isNotice });
          closeActions();
        }}
        onDelete={() => {
          const target = actionTarget;
          closeActions();
          if (target) handleDeletePress(target);
        }}
        onBlock={
          canBlock
            ? () => {
                const target = actionTarget;
                closeActions();
                if (target) requestBlock({ userId: target.authorId, name: target.authorName });
              }
            : undefined
        }
        onReport={
          canBlock
            ? () => {
                const target = actionTarget;
                closeActions();
                if (target) openReport({ targetType: "CHAT_MESSAGE", targetId: target.id });
              }
            : undefined
        }
      />
      {blockDialog}
      {reportSheet}

      <ChatImageViewer
        urls={viewer?.urls ?? []}
        startIndex={viewer?.index ?? null}
        onClose={() => setViewer(null)}
      />
    </View>
  );
}

type PendingMessage = {
  localId: string;
  /** 첨부 주소를 뺀 본문 — 첨부는 uploads를 올린 뒤 채운다 */
  body: SendChatMessageRequest;
  /** 아직 올리지 않은 첨부 (기기 안 주소). 다시 보내기도 처음부터 다시 올린다 */
  uploads?: { photos: string[]; videos: PickedVideo[]; files: PickedFile[] };
  message: ChatMessageInfo;
  failed: boolean;
  /** 첨부 업로드 진행률 0~1 (첨부가 없으면 없음) */
  progress?: number;
  /** 서버가 알려준 실패 이유 */
  error?: string;
};
