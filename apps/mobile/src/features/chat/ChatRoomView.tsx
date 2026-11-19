import type { ChatMessageInfo, SendChatMessageRequest } from "@onnuri/shared";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  BackHandler,
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { uploadAttachment, uploadImageWithProgress } from "../../shared/api/upload";
import { AppearIn } from "../../shared/components/base/AppearIn";
import { useNewItems } from "../../shared/hooks/useNewItems";
import { useAuthStore } from "../../shared/store/useAuthStore";
import type { RootStackParamList } from "../../shared/types/navigation";
import { Icon } from "../../shared/components/base/Icon";
import { useKeyboardHeight } from "../../shared/hooks/useKeyboardHeight";
import { isSameDay, isSameMinute, toChatDate } from "../../shared/utils/date";
import { colors } from "../../shared/theme/tokens";
import { useThemeColors } from "../../shared/theme/useThemeColors";
import {
  CHAT_BACKGROUNDS,
  useChatBackgroundStore,
} from "../../shared/store/useChatBackgroundStore";
import { useThemeStore } from "../../shared/store/useThemeStore";
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
import { preloadRecentPhotos } from "./components/RecentPhotos";
import { CameraPreview } from "./components/CameraPreview";
import { ChatImageViewer } from "./components/ChatImageViewer";
import { MessageActionModal } from "./components/MessageActionModal";
import { MentionText } from "./components/MentionText";
import { useBlockConfirm } from "../block/useBlockConfirm";
import { useBlockedUserIds } from "../block/api";
import { useReport } from "../report/useReport";

// 사진은 한 번에 20장까지 고르고, 보낼 때 12장씩 묶어 메시지를 나눈다 (서버 한도도 메시지당 12장).
const MAX_IMAGES = 20;
const IMAGES_PER_MESSAGE = 12;
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
  /** 헤더 돋보기를 눌러 대화 검색 중인지 (SCRUM-231) */
  searchOpen?: boolean;
  onSearchClose?: () => void;
}

// 팀·셀 단톡방 본체. 대화, 사진 보내기, 답장, 언급(@), 이모지 반응, 공지(상단 고정)를 한 화면에서
// 처리한다. 화면이 열려 있는 동안 몇 초마다 새 메시지를 받아오고, 새 메시지가 오면 맨 아래로 따라간다.
export function ChatRoomView({ kind, id, searchOpen = false, onSearchClose }: ChatRoomViewProps) {
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
  // 대화 검색 (SCRUM-231) — 불러온 최근 대화 안에서 글자가 들어간 메시지를 찾고, ∧∨로 오가며 강조한다.
  const [searchText, setSearchText] = useState("");
  const [matchCursor, setMatchCursor] = useState(0);
  const messageY = useRef(new Map<string, number>());
  // 채팅방 배경 — 방마다 내 폰에서 고른 색, 없으면 눈이 덜 부신 기본 회색 (SCRUM-229)
  const themeMode = useThemeStore((state) => state.mode);
  const backgroundId = useChatBackgroundStore((state) => state.byRoom[`${kind}:${id}`]);
  const chatBackground = CHAT_BACKGROUNDS[backgroundId ?? "default"][themeMode];
  const focused = useIsFocused();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { data: room, isPending: roomLoading } = useChatRoom(kind, id, focused);
  // 방을 연 뒤 새로 온 말풍선만 "톡" 하고 나타나게 한다 (SCRUM-215). 내가 보낸 건 보내는 중 말풍선이
  // 먼저 나타났으니 진짜로 바뀔 때는 효과를 주지 않는다.
  const { isNew, markSeen } = useNewItems(room?.messages.map((message) => message.id));
  const send = useSendChatMessage(kind, id, (message) => markSeen(message.id));
  const setNotice = useSetChatNotice(kind, id);
  const react = useToggleChatReaction(kind, id);
  const remove = useDeleteChatMessage(kind, id);

  const [draft, setDraft] = useState("");
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  // 카메라로 막 찍은 사진 — 있으면 전송 미리보기를 띄운다
  const [cameraUri, setCameraUri] = useState<string | null>(null);
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
  // 처음 열 때는 맨 아래로 순간 이동한 뒤에 보여준다 — 위에서 그렸다가 아래로 미끄러지는 게 보이지 않게 (SCRUM-232).
  const [positioned, setPositioned] = useState(false);
  const positionedAt = useRef(0);

  // + 패널은 키보드 자리에 들어간다 (SCRUM-243). 마지막 키보드 높이를 기억해 패널 높이로 쓰면
  // 키보드 ↔ 패널을 바꿀 때 채팅이 출렁이지 않는다.
  const lastKeyboardHeight = useRef(0);
  if (keyboardHeight > 0) lastKeyboardHeight.current = keyboardHeight;
  // 패널이나 키보드가 올라와 채팅 칸이 줄면 마지막 메시지가 그 바로 위에 보이게 맨 아래로 맞춘다.
  useEffect(() => {
    if (!positioned || (!attachmentSheetOpen && keyboardHeight === 0)) return;
    // 패널은 올라오는 움직임이 따로 있어서 채팅은 움직임 없이 바로 맞춘다 — 둘이 같이 움직이면 끊겨 보인다.
    const animated = !attachmentSheetOpen;
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated }), animated ? 60 : 0);
    return () => clearTimeout(timer);
  }, [attachmentSheetOpen, keyboardHeight, positioned]);
  // + 패널의 최근 사진을 방에 들어온 뒤 한가할 때 미리 읽어 둔다 — 패널이 끊김 없이 올라오게.
  useEffect(() => {
    const timer = setTimeout(preloadRecentPhotos, 1200);
    return () => clearTimeout(timer);
  }, []);
  // 안드로이드 뒤로가기는 패널부터 닫는다 (키보드와 같은 동작).
  useEffect(() => {
    if (!attachmentSheetOpen) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setAttachmentSheetOpen(false);
      return true;
    });
    return () => sub.remove();
  }, [attachmentSheetOpen]);
  const toggleAttachmentPanel = () => {
    if (attachmentSheetOpen) {
      setAttachmentSheetOpen(false);
      return;
    }
    Keyboard.dismiss();
    setAttachmentSheetOpen(true);
  };
  const messages = room?.messages ?? [];
  const searchQuery = searchOpen ? searchText.trim().toLowerCase() : "";
  // 오래된 것부터 — 커서는 가장 최근 일치(마지막)에서 시작해 ∧로 위(예전)로 간다.
  const matchIds = useMemo(
    () =>
      searchQuery === ""
        ? []
        : messages
            .filter((message) => message.content.toLowerCase().includes(searchQuery))
            .map((message) => message.id),
    [messages, searchQuery],
  );
  const currentMatchId = matchIds.length > 0 ? matchIds[matchCursor] : null;

  // 읽음 표시 — 방이 열려 있는 동안 가장 최근 메시지가 바뀔 때마다 서버에 알린다. 알린 뒤 목록·아이콘의
  // 안 읽은 표시를 다시 받아 빨간 점이 사라지게 한다.
  const queryClient = useQueryClient();
  // 검색어가 바뀌면 가장 최근 일치로, 검색을 닫으면 검색어를 비운다.
  useEffect(() => {
    setMatchCursor(Math.max(0, matchIds.length - 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 검색어가 바뀔 때만 커서를 옮긴다
  }, [searchQuery]);
  useEffect(() => {
    if (!searchOpen) setSearchText("");
  }, [searchOpen]);
  // 지금 가리키는 메시지가 화면 위쪽에 오게 스크롤한다.
  useEffect(() => {
    if (!currentMatchId) return;
    const y = messageY.current.get(currentMatchId);
    if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, y - 120), animated: true });
  }, [currentMatchId]);
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

  // 패널은 팝업이 아니라서 닫힘을 기다릴 필요 없이 바로 선택창을 연다 (SCRUM-243 — 예전엔 0.7초 대기).
  const pickAfterSheetClosed = (action: () => Promise<void>) => {
    setAttachmentSheetOpen(false);
    action().catch(() => {
      Alert.alert(t("열 수 없어요"), t("사진·파일 접근 권한을 확인한 뒤 다시 시도해주세요."));
    });
  };

  // 카메라로 찍으면 카카오톡처럼 미리보기(설명 입력·전송)를 띄운다 (SCRUM-228).
  const handlePickCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        t("카메라 권한이 필요해요"),
        t("설정에서 온누리 온의 카메라 접근을 허용해주세요."),
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled || result.assets.length === 0) return;
    setCameraUri(result.assets[0].uri);
  };

  // 앨범에서 사진·동영상을 함께 고른다. 사진은 20장, 동영상은 3개·50MB까지다.
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
    patchPending(localId, {
      failed: false,
      error: undefined,
      upload: uploads
        ? {
            loaded: 0,
            total: 0,
            current: 1,
            count: uploads.photos.length + uploads.videos.length + uploads.files.length,
          }
        : undefined,
    });
    sendQueue.current = sendQueue.current.then(async () => {
      try {
        let finalBody = body;
        if (uploads) {
          // 파일마다 보낸 바이트를 모아 전체 용량과 몇 번째 파일인지 낸다 (카카오톡처럼 말풍선 위에 표시).
          const count = uploads.photos.length + uploads.videos.length + uploads.files.length;
          const loaded: number[] = [];
          const totals: number[] = [];
          const track = (index: number) => (sent: number, total: number) => {
            loaded[index] = sent;
            totals[index] = total;
            const sum = totals.reduce((acc, value) => acc + (value ?? 0), 0);
            const done = loaded.reduce((acc, value) => acc + (value ?? 0), 0);
            const finished = totals.filter(
              (value, at) => value > 0 && (loaded[at] ?? 0) >= value,
            ).length;
            patchPending(localId, {
              upload: { loaded: done, total: sum, current: Math.min(count, finished + 1), count },
            });
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
        }
        await send.mutateAsync(finalBody);
        setPending((prev) => prev.filter((value) => value.localId !== localId));
      } catch (error) {
        // 용량·형식 문제 등 서버가 알려준 이유를 말풍선 아래에 보여준다.
        const message = (error as { response?: { data?: { message?: string | string[] } } })
          .response?.data?.message;
        patchPending(localId, {
          failed: true,
          error: Array.isArray(message) ? message[0] : message,
        });
      }
    });
  };

  // 메시지를 보낸다 — 입력창 보내기와 카메라 미리보기 전송이 같이 쓴다.
  const sendMessages = (params: {
    content: string;
    photos: string[];
    videos: PickedVideo[];
    files: PickedFile[];
    replyTo: ChatMessageInfo | null;
    mentionedUserIds: string[];
    mentions: { id: string; name: string }[];
    asNotice: boolean;
  }) => {
    // 글자든 첨부든 보내기를 누르면 바로 "보내는 중" 말풍선을 띄운다 (SCRUM-226).
    // 첨부는 기기 안의 사진·파일 주소로 먼저 그리고, 업로드는 뒤에서 진행한다.
    // 사진이 12장을 넘으면 12장씩 묶어 메시지를 나눈다 — 글·답장·동영상·파일은 첫 묶음에 붙인다.
    const photoChunks: string[][] = [];
    for (let at = 0; at < params.photos.length; at += IMAGES_PER_MESSAGE) {
      photoChunks.push(params.photos.slice(at, at + IMAGES_PER_MESSAGE));
    }
    if (photoChunks.length === 0) photoChunks.push([]);

    const items = photoChunks.map((photos, chunkIndex): PendingMessage => {
      const first = chunkIndex === 0;
      const chunkVideos = first ? params.videos : [];
      const chunkFiles = first ? params.files : [];
      const chunkContent = first ? params.content : "";
      const chunkMentions = first ? params.mentionedUserIds : [];
      const body: SendChatMessageRequest = {
        content: chunkContent,
        ...(first && params.replyTo && { replyToId: params.replyTo.id }),
        ...(chunkMentions.length > 0 && { mentionedUserIds: chunkMentions }),
        ...(first && params.asNotice && { asNotice: true }),
      };
      const hasChunkAttachment = photos.length + chunkVideos.length + chunkFiles.length > 0;
      const localId = `local-${Date.now()}-${chunkIndex}-${Math.random().toString(36).slice(2, 8)}`;
      return {
        localId,
        body,
        uploads: hasChunkAttachment
          ? { photos, videos: chunkVideos, files: chunkFiles }
          : undefined,
        failed: false,
        message: {
          id: localId,
          authorId: me?.id ?? "",
          authorName: me?.name ?? "",
          authorAvatarUrl: me?.avatarUrl ?? null,
          content: chunkContent,
          imageUrls: photos,
          videoUrls: chunkVideos.map((video) => video.uri),
          files: chunkFiles.map((file) => ({ url: file.uri, name: file.name, size: file.size })),
          replyTo:
            first && params.replyTo
              ? {
                  id: params.replyTo.id,
                  authorName: params.replyTo.authorName,
                  content: params.replyTo.content,
                  hasImage: params.replyTo.imageUrls.length > 0,
                }
              : null,
          poll: null,
          mentions: params.mentions.filter((member) => chunkMentions.includes(member.id)),
          isNotice: first && params.asNotice,
          reactions: [],
          createdAt: new Date().toISOString(),
          isMine: true,
          canDelete: false,
          isSystem: false,
          unreadCount: 0,
        },
      };
    });
    setPending((prev) => [...prev, ...items]);
    for (const item of items) deliver(item);
  };

  const handleSend = () => {
    if (!canSend) return;
    const content = draft.trim();
    // 본문에서 "@이름"이 지워진 언급은 보내지 않는다.
    const mentionedUserIds = mentioned
      .filter((member) => content.includes(`@${member.name}`))
      .map((member) => member.id);
    sendMessages({
      content,
      photos: photoUris,
      videos,
      files,
      replyTo,
      mentionedUserIds,
      mentions: mentioned,
      asNotice,
    });
    resetComposer();
  };

  // 카메라로 찍은 사진을 미리보기에서 바로 보낸다 — 설명을 쓰면 사진 아래 글로 같이 간다 (SCRUM-228).
  const sendCameraPhoto = (uri: string, caption: string) => {
    sendMessages({
      content: caption.trim(),
      photos: [uri],
      videos: [],
      files: [],
      replyTo: null,
      mentionedUserIds: [],
      mentions: [],
      asNotice: false,
    });
  };

  const handleDeletePress = (message: ChatMessageInfo) => {
    Alert.alert(t("메시지를 삭제할까요?"), undefined, [
      { text: t("취소"), style: "cancel" },
      { text: t("삭제"), style: "destructive", onPress: () => remove.mutate(message.id) },
    ]);
  };

  const closeActions = () => setActionTarget(null);

  // 메시지 한 건 — 차단한 사람 글은 가리고, 검색 중에는 찾은 글자만 칠한다 (지금 결과는 진하게).
  const renderMessage = (message: ChatMessageInfo, showTime: boolean) =>
    !message.isMine && !message.isSystem && blockedIds.has(message.authorId) ? (
      <Text className="text-body-small text-text-alternative">
        {t("차단한 사용자의 메시지예요")}
      </Text>
    ) : (
      <View onLayout={(event) => messageY.current.set(message.id, event.nativeEvent.layout.y)}>
        <AppearIn variant="pop" animate={isNew(message.id)}>
          <ChatBubble
            message={message}
            kind={kind}
            roomId={id}
            showTime={showTime}
            highlight={searchQuery || undefined}
            highlightActive={message.id === currentMatchId}
            onLongPress={() => setActionTarget(message)}
            onImagePress={(index) => setViewer({ urls: message.imageUrls, index })}
            onReactionPress={(emoji) => react.mutate({ messageId: message.id, emoji })}
          />
        </AppearIn>
      </View>
    );

  return (
    <View className="flex-1" style={{ backgroundColor: chatBackground }}>
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

      {/* 대화 검색창 (SCRUM-231) */}
      {searchOpen && (
        <View className="flex-row items-center gap-3 border-b border-background-assistive bg-background-normal px-5 py-2">
          <View className="h-10 flex-1 flex-row items-center gap-2 rounded-xl bg-background-muted px-3">
            <Icon name="search" size={18} color={themeColors.icon.normal} />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder={t("대화내용 검색")}
              placeholderTextColor={themeColors.text.alternative}
              className="flex-1 text-body-main text-text-normal"
              autoFocus
              returnKeyType="search"
            />
          </View>
          <Pressable hitSlop={8} onPress={onSearchClose}>
            <Text className="text-body-main text-text-normal">{t("취소")}</Text>
          </Pressable>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        contentContainerClassName="gap-4 px-5 py-4"
        keyboardShouldPersistTaps="handled"
        // 새 메시지가 생겼을 때만 맨 아래로 간다 — 같은 내용을 다시 받을 때는 위치를 건드리지 않는다.
        onContentSizeChange={() => {
          const count = messages.length + pending.length;
          if (count === 0) return;
          if (!positioned) {
            // 첫 화면 — 애니메이션 없이 맨 아래에서 시작하고, 자리를 잡은 다음 프레임에 보여준다.
            lastCount.current = count;
            scrollRef.current?.scrollToEnd({ animated: false });
            positionedAt.current = Date.now();
            requestAnimationFrame(() => setPositioned(true));
            return;
          }
          // 연 직후 사진이 늦게 그려져 높이가 늘면 맨 아래를 다시 맞춘다 (1.5초 안에서만).
          if (count === lastCount.current && Date.now() - positionedAt.current < 1500) {
            scrollRef.current?.scrollToEnd({ animated: false });
            return;
          }
          // 그다음부터는 새 메시지가 생겼을 때만 부드럽게 따라간다.
          if (count !== lastCount.current) {
            lastCount.current = count;
            scrollRef.current?.scrollToEnd({ animated: true });
          }
        }}
        style={{ opacity: positioned || messages.length + pending.length === 0 ? 1 : 0 }}
      >
        {/* 불러오는 동안에는 "대화가 없어요"를 띄우지 않는다 */}
        {!roomLoading && messages.length === 0 && (
          <Text className="pt-10 text-center text-body-medium text-text-alternative">
            {t("아직 대화가 없어요. 첫 메시지를 남겨보세요.")}
          </Text>
        )}
        {messages.map((message, index) => {
          const previous = index > 0 ? messages[index - 1] : null;
          const next = index < messages.length - 1 ? messages[index + 1] : null;
          // 날이 바뀌면 카카오톡처럼 가운데에 "2026년 11월 8일 일요일" 구분선 (SCRUM-234)
          const dateDivider =
            previous === null || !isSameDay(previous.createdAt, message.createdAt) ? (
              <View className="items-center py-1">
                <Text className="rounded-full bg-background-muted px-3 py-1 text-caption-main text-text-alternative">
                  {toChatDate(message.createdAt)}
                </Text>
              </View>
            ) : null;
          // 같은 사람이 같은 분에 연달아 보낸 메시지는 마지막에만 시각을 단다
          const showTime =
            next === null ||
            next.authorId !== message.authorId ||
            next.isSystem ||
            !isSameMinute(next.createdAt, message.createdAt) ||
            !isSameDay(next.createdAt, message.createdAt);
          return (
            <Fragment key={message.id}>
              {dateDivider}
              {renderMessage(message, showTime)}
            </Fragment>
          );
        })}
        {pending.map((item) => {
          const removePending = () =>
            setPending((prev) => prev.filter((value) => value.localId !== item.localId));
          return (
            <AppearIn key={item.localId} variant="pop" animate>
              <View className="gap-1">
                {/* 첨부는 말풍선 위에 진행 상태를 덮어 그리고(카카오톡처럼), 글자만 보낼 때는 흐리게 */}
                <View style={{ opacity: item.uploads || item.failed ? 1 : 0.5 }}>
                  <ChatBubble
                    message={item.message}
                    kind={kind}
                    roomId={id}
                    onLongPress={() => undefined}
                    onImagePress={() => undefined}
                    onReactionPress={() => undefined}
                    upload={
                      item.uploads || item.failed
                        ? {
                            loaded: item.upload?.loaded ?? 0,
                            total: item.upload?.total ?? 0,
                            current: item.upload?.current ?? 1,
                            count: item.upload?.count ?? 1,
                            failed: item.failed,
                            onRetry: () => deliver(item),
                            onCancel: removePending,
                          }
                        : undefined
                    }
                  />
                </View>
                {item.failed && (
                  <Text
                    className="text-right text-caption-main text-semantic-danger"
                    numberOfLines={2}
                  >
                    {item.error ? `${t("전송 실패")} · ${item.error}` : t("전송 실패")}
                  </Text>
                )}
              </View>
            </AppearIn>
          );
        })}
      </ScrollView>

      {/* 언급 후보 */}
      {!searchOpen && mentionCandidates.length > 0 && (
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

      {/* 검색 중에는 입력창 대신 일치 개수와 ∧∨ 이동 (카카오톡처럼) */}
      {searchOpen && (
        <View
          className="flex-row items-center justify-between border-t border-background-assistive bg-background-normal px-5 pt-2"
          style={{ paddingBottom: (keyboardHeight || insets.bottom) + 8 }}
        >
          <Text className="text-body-small text-text-alternative">
            {searchQuery === ""
              ? t("최근 대화에서 찾아요")
              : matchIds.length === 0
                ? t("검색 결과가 없어요")
                : `${matchCursor + 1} / ${matchIds.length}`}
          </Text>
          <View className="flex-row items-center gap-2">
            <Pressable
              hitSlop={6}
              disabled={matchCursor <= 0}
              onPress={() => setMatchCursor((value) => Math.max(0, value - 1))}
              className="h-10 w-10 items-center justify-center rounded-full bg-background-muted"
              style={{ opacity: matchCursor <= 0 ? 0.4 : 1 }}
              accessibilityLabel={t("이전 결과")}
            >
              <Text className="text-body-main text-text-normal">∧</Text>
            </Pressable>
            <Pressable
              hitSlop={6}
              disabled={matchCursor >= matchIds.length - 1}
              onPress={() => setMatchCursor((value) => Math.min(matchIds.length - 1, value + 1))}
              className="h-10 w-10 items-center justify-center rounded-full bg-background-muted"
              style={{ opacity: matchCursor >= matchIds.length - 1 ? 0.4 : 1 }}
              accessibilityLabel={t("다음 결과")}
            >
              <Text className="text-body-main text-text-normal">∨</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* 입력 영역 — 답장 대상·첨부 사진 미리보기·입력줄. + 패널이 열려 있으면 숨긴다 (카카오톡처럼) */}
      {!searchOpen && !attachmentSheetOpen && (
        <View
          className="border-t border-background-assistive bg-background-normal px-5 pt-2"
          // + 패널이 열려 있으면 바닥 여백은 패널이 맡는다
          style={{
            paddingBottom: attachmentSheetOpen ? 8 : (keyboardHeight || insets.bottom) + 8,
          }}
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
                    onPress={() =>
                      setVideos((prev) => prev.filter((item) => item.uri !== video.uri))
                    }
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
              onPress={toggleAttachmentPanel}
              accessibilityLabel={attachmentSheetOpen ? t("닫기") : t("첨부")}
            >
              {/* 열려 있으면 +를 45도 돌려 ×로 보여준다 (카카오톡처럼) */}
              <View style={attachmentSheetOpen ? { transform: [{ rotate: "45deg" }] } : undefined}>
                <Icon name="plus" size={20} />
              </View>
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
              // 입력창을 누르면 패널이 내려가고 키보드로 바뀐다
              onFocus={() => setAttachmentSheetOpen(false)}
              placeholder={asNotice ? t("공지로 보낼 내용을 입력하세요") : t("메시지를 입력하세요")}
              placeholderTextColor={themeColors.text.alternative}
              onSubmitEditing={canSend ? () => handleSend() : undefined}
              returnKeyType="send"
            />
            <Pressable
              className="h-9 w-9 items-center justify-center rounded-full bg-background-alternative active:opacity-60"
              disabled={!canSend}
              onPress={() => handleSend()}
            >
              <Icon
                name="send-fill"
                size={20}
                color={canSend ? themeColors.primary.normal : themeColors.icon.normal}
              />
            </Pressable>
          </View>
        </View>
      )}

      {/* + 패널 — 입력줄 대신 키보드 자리에 올라온다 (SCRUM-243). 채팅은 그만큼 줄어 마지막 메시지가
          패널 위에 보이고, 패널 밖(어두워진 채팅)을 누르거나 손잡이를 아래로 끌면 닫힌다. */}
      {!searchOpen && attachmentSheetOpen && (
        <Pressable
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
          onPress={() => setAttachmentSheetOpen(false)}
          accessibilityLabel={t("닫기")}
        />
      )}
      {!searchOpen && attachmentSheetOpen && (
        <AttachmentSheet
          onClose={() => setAttachmentSheetOpen(false)}
          minHeight={lastKeyboardHeight.current || undefined}
          onPickCamera={() => pickAfterSheetClosed(handlePickCamera)}
          onSendRecent={(uris) => {
            // 최근 사진 줄에서 고른 사진을 바로 보낸다 (SCRUM-241) — 12장씩 나누는 것도 같은 길로 간다.
            setAttachmentSheetOpen(false);
            sendMessages({
              content: "",
              photos: uris,
              videos: [],
              files: [],
              replyTo: null,
              mentionedUserIds: [],
              mentions: [],
              asNotice: false,
            });
          }}
          onPickMedia={() => pickAfterSheetClosed(handlePickMedia)}
          onPickFile={() => pickAfterSheetClosed(handlePickFile)}
          onPickPoll={() => {
            setAttachmentSheetOpen(false);
            navigation.navigate("ChatPollCreate", { kind, id });
          }}
        />
      )}

      <CameraPreview
        uri={cameraUri}
        onClose={() => setCameraUri(null)}
        onSend={(caption) => {
          if (cameraUri) sendCameraPhoto(cameraUri, caption);
          setCameraUri(null);
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
  /** 첨부 업로드 상태 — 보낸/전체 바이트, 몇 번째 파일인지 (첨부가 없으면 없음) */
  upload?: { loaded: number; total: number; current: number; count: number };
  /** 서버가 알려준 실패 이유 */
  error?: string;
};
