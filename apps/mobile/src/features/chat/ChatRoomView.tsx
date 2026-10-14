import type { ChatMessageInfo } from "@onnuri/shared";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { uploadAttachment, uploadImage } from "../../shared/api/upload";
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
  const themeColors = useThemeColors();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const focused = useIsFocused();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { data: room } = useChatRoom(kind, id, focused);
  const send = useSendChatMessage(kind, id);
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
  const [sending, setSending] = useState(false);
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
      : (room?.members ?? [])
          .filter((member) => member.name.includes(mentionQuery))
          .slice(0, 6);

  const handlePickMention = (member: { id: string; name: string }) => {
    setDraft((prev) => prev.replace(/@([^\s@]*)$/, `@${member.name} `));
    setMentioned((prev) => (prev.some((item) => item.id === member.id) ? prev : [...prev, member]));
  };

  // 앨범에서 사진·동영상을 함께 고른다. 사진은 5장, 동영상은 3개·50MB까지다.
  const handlePickMedia = async () => {
    setAttachmentSheetOpen(false);
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
      Alert.alert(t("동영상은 50MB까지 보낼 수 있어요"), t("용량이 큰 동영상 {{count}}개는 제외했어요.", { count: skipped }));
    }
  };

  // 파일(악보·문서)은 expo-document-picker로 고른다. 이 모듈은 앱을 새로 빌드해야 들어 있어서,
  // 아직 반영되지 않은 빌드에서는 오류 대신 안내를 보여준다.
  const handlePickFile = async () => {
    setAttachmentSheetOpen(false);
    let DocumentPicker: typeof import("expo-document-picker");
    try {
      DocumentPicker = require("expo-document-picker");
    } catch {
      Alert.alert(t("앱 업데이트가 필요해요"), t("파일 보내기는 앱을 새로 설치한 뒤에 쓸 수 있어요."));
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
      Alert.alert(t("파일은 10MB까지 보낼 수 있어요"), t("용량이 큰 파일 {{count}}개는 제외했어요.", { count: skipped }));
    }
  };

  const hasAttachment = photoUris.length + videos.length + files.length > 0;
  const canSend = (draft.trim() !== "" || hasAttachment) && !sending;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const [imageUrls, videoUrls, uploadedFiles] = await Promise.all([
        Promise.all(photoUris.map((uri) => uploadImage(uri))),
        Promise.all(
          videos.map((video) =>
            uploadAttachment(video.uri, { name: video.name, mimeType: video.mimeType }),
          ),
        ),
        Promise.all(
          files.map(async (file) => ({
            url: await uploadAttachment(file.uri, { name: file.name, mimeType: file.mimeType }),
            name: file.name,
            size: file.size,
          })),
        ),
      ]);
      const content = draft.trim();
      // 본문에서 "@이름"이 지워진 언급은 보내지 않는다.
      const mentionedUserIds = mentioned
        .filter((member) => content.includes(`@${member.name}`))
        .map((member) => member.id);
      await send.mutateAsync({
        content,
        ...(imageUrls.length > 0 && { imageUrls }),
        ...(videoUrls.length > 0 && { videoUrls }),
        ...(uploadedFiles.length > 0 && { files: uploadedFiles }),
        ...(replyTo && { replyToId: replyTo.id }),
        ...(mentionedUserIds.length > 0 && { mentionedUserIds }),
        ...(asNotice && { asNotice: true }),
      });
      setDraft("");
      setPhotoUris([]);
      setVideos([]);
      setFiles([]);
      setReplyTo(null);
      setMentioned([]);
      setAsNotice(false);
    } catch {
      Alert.alert(t("전송 실패"), t("잠시 후 다시 시도해주세요."));
    } finally {
      setSending(false);
    }
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
          if (messages.length !== lastCount.current) {
            lastCount.current = messages.length;
            scrollRef.current?.scrollToEnd({ animated: true });
          }
        }}
      >
        {messages.length === 0 && (
          <Text className="pt-10 text-center text-body-medium text-text-alternative">
            {t("아직 대화가 없어요. 첫 메시지를 남겨보세요.")}
          </Text>
        )}
        {messages.map((message) => (
          <ChatBubble
            key={message.id}
            message={message}
            kind={kind}
            roomId={id}
            onLongPress={() => setActionTarget(message)}
            onImagePress={(index) => setViewer({ urls: message.imageUrls, index })}
            onReactionPress={(emoji) => react.mutate({ messageId: message.id, emoji })}
          />
        ))}
      </ScrollView>

      {/* 언급 후보 */}
      {mentionCandidates.length > 0 && (
        <View
          className="border-t border-background-assistive bg-background-normal px-5 py-2"
        >
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
        onPickMedia={() => void handlePickMedia()}
        onPickFile={() => void handlePickFile()}
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
          if (actionTarget) setNotice.mutate({ messageId: actionTarget.id, on: !actionTarget.isNotice });
          closeActions();
        }}
        onDelete={() => {
          const target = actionTarget;
          closeActions();
          if (target) handleDeletePress(target);
        }}
      />

      <ChatImageViewer
        urls={viewer?.urls ?? []}
        startIndex={viewer?.index ?? null}
        onClose={() => setViewer(null)}
      />
    </View>
  );
}
