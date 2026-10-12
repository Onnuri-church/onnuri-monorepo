import { BOARD_EMOJIS, type TeamBoardCommentInfo } from "@onnuri/shared";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { Avatar } from "../../shared/components/base/Avatar";
import { Header } from "../../shared/components/base/Header";
import { Icon } from "../../shared/components/base/Icon";
import { CommentInput } from "../../shared/components/composed/CommentInput";
import { useKeyboardHeight } from "../../shared/hooks/useKeyboardHeight";
import type { RootStackParamList } from "../../shared/types/navigation";
import { toTimeAgo } from "../../shared/utils/date";
import { ChatImageViewer } from "../chat/components/ChatImageViewer";
import {
  useAddBoardComment,
  useDeleteBoardComment,
  useDeleteBoardPost,
  useTeamBoardPost,
  useToggleBoardReaction,
  useUpdateBoardComment,
} from "./api";
import { extractUrls, LinkifiedText } from "./components/LinkifiedText";
import { LinkPreviewCard } from "./components/LinkPreviewCard";
import { ReactorsModal } from "./components/ReactorsModal";

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

const REACTOR_PREVIEW_COUNT = 6;

// 팀 게시판 글 상세 — 밴드처럼 본문(링크 미리보기·사진 세로 나열), "표정·댓글" 줄, 이모지를 단 사람들,
// 댓글·대댓글이 한 화면에 이어진다. 수정은 작성자·관리자, 삭제는 작성자·팀장·관리자.
export function TeamBoardDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { width: windowWidth } = useWindowDimensions();
  const { params } = useRoute<RouteProp<RootStackParamList, "TeamBoardDetail">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { teamId, postId } = params;

  const { data: post } = useTeamBoardPost(teamId, postId);
  const addComment = useAddBoardComment(teamId, postId);
  const deleteComment = useDeleteBoardComment(teamId, postId);
  const updateComment = useUpdateBoardComment(teamId, postId);
  const react = useToggleBoardReaction(teamId, postId);
  const deletePost = useDeleteBoardPost(teamId);
  const deleteDialogRef = useRef<AppDialogRef>(null);

  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<TeamBoardCommentInfo | null>(null);
  // 수정 중인 댓글 — 있으면 아래 입력줄이 수정 모드가 된다 (등록 대신 저장).
  const [editing, setEditing] = useState<TeamBoardCommentInfo | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [emojiBarOpen, setEmojiBarOpen] = useState(false);
  const [reactorsOpen, setReactorsOpen] = useState(false);
  // 사진마다 원본 비율로 그린다 (밴드처럼 잘라내지 않고 가로를 꽉 채운다).
  const [ratios, setRatios] = useState<Record<string, number>>({});
  // 지금 화면 가운데에 있는 사진 번호 ("1/5" 표시용)
  const [currentImage, setCurrentImage] = useState(0);
  const imageLayouts = useRef<Record<number, { y: number; height: number }>>({});
  const imagesBlockY = useRef(0);

  useLayoutEffect(() => {
    const items = [
      ...(post?.canEdit
        ? [
            {
              icon: "edit" as const,
              label: t("수정하기"),
              onPress: () => navigation.navigate("TeamBoardWrite", { teamId, postId }),
            },
          ]
        : []),
      ...(post?.canDelete
        ? [
            {
              icon: "trash-can" as const,
              label: t("삭제하기"),
              onPress: () => deleteDialogRef.current?.open(),
            },
          ]
        : []),
    ];
    navigation.setOptions({
      header: () => (
        <Header
          variant="sub"
          title={t("팀 게시판")}
          rightAction={items.length > 0 ? "more" : "none"}
          menuItems={items}
        />
      ),
    });
  }, [navigation, post?.canEdit, post?.canDelete, teamId, postId, t]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!post || post.imageUrls.length < 2) return;
    // 화면 가운데 높이가 걸쳐 있는 사진을 현재 사진으로 본다.
    const center = event.nativeEvent.contentOffset.y + event.nativeEvent.layoutMeasurement.height / 2;
    let found = 0;
    post.imageUrls.forEach((_, index) => {
      const layout = imageLayouts.current[index];
      if (layout && center >= imagesBlockY.current + layout.y) found = index;
    });
    if (found !== currentImage) setCurrentImage(found);
  };

  const handleSubmitComment = () => {
    const content = draft.trim();
    if (!content || addComment.isPending || updateComment.isPending) return;
    if (editing) {
      updateComment.mutate(
        { commentId: editing.id, content },
        {
          onSuccess: () => {
            setDraft("");
            setEditing(null);
          },
          onError: () => Alert.alert(t("댓글 수정 실패"), t("잠시 후 다시 시도해주세요.")),
        },
      );
      return;
    }
    addComment.mutate(
      { content, ...(replyTo && { parentId: replyTo.id }) },
      {
        onSuccess: () => {
          setDraft("");
          setReplyTo(null);
        },
        onError: () => Alert.alert(t("댓글 등록 실패"), t("잠시 후 다시 시도해주세요.")),
      },
    );
  };

  const handleDeleteComment = (comment: TeamBoardCommentInfo) => {
    Alert.alert(t("댓글을 삭제할까요?"), undefined, [
      { text: t("취소"), style: "cancel" },
      { text: t("삭제"), style: "destructive", onPress: () => deleteComment.mutate(comment.id) },
    ]);
  };

  const confirmDeletePost = () => {
    deleteDialogRef.current?.close();
    deletePost.mutate(postId, {
      onSuccess: () => navigation.goBack(),
      onError: () => Alert.alert(t("삭제 실패"), t("잠시 후 다시 시도해주세요.")),
    });
  };

  const handleEmojiPick = (emoji: string) => {
    setEmojiBarOpen(false);
    react.mutate(emoji);
  };

  if (!post) {
    return (
      <View className="flex-1 items-center justify-center bg-background-normal">
        <Text className="text-body-medium text-text-alternative">{t("글을 불러오고 있어요.")}</Text>
      </View>
    );
  }

  // 링크 미리보기는 본문 속 주소와 따로 붙인 링크를 합쳐서 한 번씩만 보여준다.
  const linkUrls = Array.from(new Set([...extractUrls(post.content), ...post.links]));
  const totalReactions = post.reactors.length;

  const renderComment = (comment: TeamBoardCommentInfo, isReply: boolean) => (
    <View key={comment.id} className={isReply ? "ml-10 flex-row gap-2 py-2" : "flex-row gap-2 py-2"}>
      <Avatar imageUrl={comment.authorAvatarUrl} size={isReply ? 28 : 36} />
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-body-main text-text-normal">{comment.authorName}</Text>
          <Text className="text-body-small text-text-alternative">{toTimeAgo(comment.createdAt)}</Text>
        </View>
        <Text className="mt-1 text-body-medium text-text-neutral">{comment.content}</Text>
        <View className="mt-1 flex-row gap-3">
          {!isReply && (
            <Pressable onPress={() => setReplyTo(comment)} hitSlop={8}>
              <Text className="text-body-small text-text-alternative">{t("답글")}</Text>
            </Pressable>
          )}
          {comment.canEdit && (
            <Pressable
              onPress={() => {
                setEditing(comment);
                setReplyTo(null);
                setDraft(comment.content);
              }}
              hitSlop={8}
            >
              <Text className="text-body-small text-text-alternative">{t("수정")}</Text>
            </Pressable>
          )}
          {comment.canDelete && (
            <Pressable onPress={() => handleDeleteComment(comment)} hitSlop={8}>
              <Text className="text-body-small text-text-alternative">{t("삭제")}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-background-normal">
      <ScrollView onScroll={handleScroll} scrollEventThrottle={32} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* 작성자 */}
        <View className="flex-row items-center gap-3 px-5 pt-4">
          <Avatar imageUrl={post.authorAvatarUrl} size={44} />
          <View>
            <Text className="text-body-main text-text-normal">{post.authorName}</Text>
            <Text className="text-caption-main text-text-alternative">
              {toTimeAgo(post.createdAt)}
              {post.editedAt ? ` · ${t("수정됨")}` : ""} · {t("읽음 {{count}}", { count: post.readCount })}
            </Text>
          </View>
        </View>

        {post.isNotice && (
          <View className="mx-5 mt-3 self-start rounded-full bg-background-gold px-2.5 py-1">
            <Text className="text-caption-main text-semantic-warning">{t("공지")}</Text>
          </View>
        )}

        {/* 본문 — 주소는 눌러서 열 수 있게 파랗게 */}
        {post.content !== "" && (
          <View className="px-5 pt-4">
            <LinkifiedText text={post.content} className="text-body-regular text-text-normal" />
          </View>
        )}

        {/* 링크 미리보기 */}
        {linkUrls.length > 0 && (
          <View className="gap-3 px-5 pt-4">
            {linkUrls.map((url) => (
              <LinkPreviewCard key={url} url={url} />
            ))}
          </View>
        )}

        {/* 파일 */}
        {post.files.length > 0 && (
          <View className="gap-2 px-5 pt-4">
            {post.files.map((file) => (
              <Pressable
                key={file.url}
                className="flex-row items-center gap-2 rounded-xl bg-background-muted px-3 py-3 active:opacity-60"
                onPress={() => void Linking.openURL(file.url)}
              >
                <Icon name="note" size={20} />
                <Text className="flex-1 text-body-small text-text-normal" numberOfLines={1}>
                  {file.name}
                </Text>
                <Text className="text-caption-main text-text-alternative">{formatSize(file.size)}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* 사진 — 가로를 꽉 채우고 원본 비율 그대로 세로로 이어 붙인다 */}
        {post.imageUrls.length > 0 && (
          <View
            className="mt-4 gap-1"
            onLayout={(event) => {
              imagesBlockY.current = event.nativeEvent.layout.y;
            }}
          >
            {post.imageUrls.map((url, index) => (
              <View
                key={`${index}-${url}`}
                onLayout={(event) => {
                  imageLayouts.current[index] = {
                    y: event.nativeEvent.layout.y,
                    height: event.nativeEvent.layout.height,
                  };
                }}
              >
                <Pressable onPress={() => setViewerIndex(index)}>
                  <Image
                    source={{ uri: url }}
                    style={{ width: windowWidth, aspectRatio: ratios[url] ?? 4 / 3 }}
                    resizeMode="cover"
                    onLoad={(event) => {
                      const { width, height } = event.nativeEvent.source;
                      if (width > 0 && height > 0) {
                        setRatios((prev) => (prev[url] ? prev : { ...prev, [url]: width / height }));
                      }
                    }}
                  />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* 표정·댓글 수 + 이모지를 단 사람들 */}
        <View className="mt-6 bg-background-muted px-5 pb-4 pt-4">
          <Text className="text-body-main text-text-normal">
            {t("표정")} <Text className="text-primary-normal">{totalReactions}</Text>
            {"  ·  "}
            {t("댓글")} <Text className="text-primary-normal">{post.commentCount}</Text>
          </Text>

          <View className="mt-3 flex-row items-center">
            <View>
              <Pressable
                className="h-12 w-12 items-center justify-center rounded-full bg-background-alternative active:opacity-60"
                onPress={() => setEmojiBarOpen((prev) => !prev)}
              >
                <Icon name="add-round-light" size={24} />
              </Pressable>
              {emojiBarOpen && (
                <View
                  className="absolute flex-row items-center gap-1 rounded-full bg-background-normal px-2 py-1.5 shadow-dropdown"
                  style={{ bottom: 56, left: 0, width: BOARD_EMOJIS.length * 46 + 16 }}
                >
                  {BOARD_EMOJIS.map((emoji) => (
                    <Pressable
                      key={emoji}
                      className="h-10 w-10 items-center justify-center rounded-full active:bg-background-muted"
                      onPress={() => handleEmojiPick(emoji)}
                    >
                      <Text className="text-heading-medium">{emoji}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <View className="ml-3 flex-1 flex-row items-center">
              {post.reactors.slice(0, REACTOR_PREVIEW_COUNT).map((reactor, index) => (
                <View key={`${reactor.userId}-${reactor.emoji}`} className={index === 0 ? "" : "-ml-1"}>
                  <Avatar imageUrl={reactor.avatarUrl} size={44} />
                  <Text className="absolute -bottom-1 -right-1 text-body-main">{reactor.emoji}</Text>
                </View>
              ))}
            </View>
            {totalReactions > 0 && (
              <Pressable onPress={() => setReactorsOpen(true)} hitSlop={10}>
                <Icon name="expand-right" size={24} />
              </Pressable>
            )}
          </View>
        </View>

        {/* 댓글 */}
        <View className="px-5 pt-4">
          {post.comments.length === 0 ? (
            <View className="items-center rounded-2xl bg-background-muted py-6">
              <Text className="text-body-small text-text-alternative">
                {t("멤버들과 댓글로 대화해 보세요.")}
              </Text>
            </View>
          ) : (
            post.comments.map((comment) => (
              <View key={comment.id}>
                {renderComment(comment, false)}
                {comment.replies.map((reply) => renderComment(reply, true))}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* 사진 번호 — 사진이 둘 이상일 때 화면 아래에 떠서 지금 보는 사진을 알려 준다 */}
      {post.imageUrls.length > 1 && (
        <View
          pointerEvents="none"
          className="absolute left-0 right-0 items-center"
          style={{ bottom: (keyboardHeight || insets.bottom) + 84 }}
        >
          <View className="flex-row items-center gap-2 rounded-full bg-background-dark/70 px-4 py-2">
            <Icon name="image" size={16} color="#FFFFFF" />
            <Text className="text-body-small text-text-onImage">
              {currentImage + 1}/{post.imageUrls.length}
            </Text>
          </View>
        </View>
      )}

      {/* 댓글 입력 */}
      <View
        className="border-t border-background-assistive bg-background-normal px-5 pt-2"
        style={{ paddingBottom: (keyboardHeight || insets.bottom) + 8 }}
      >
        {editing && (
          <View className="mb-2 flex-row items-center rounded-xl bg-background-muted px-3 py-2">
            <Text className="flex-1 text-caption-main text-text-neutral" numberOfLines={1}>
              {t("댓글 수정 중")}
            </Text>
            <Pressable
              onPress={() => {
                setEditing(null);
                setDraft("");
              }}
              hitSlop={8}
            >
              <Icon name="close-square" size={18} />
            </Pressable>
          </View>
        )}
        {replyTo && !editing && (
          <View className="mb-2 flex-row items-center rounded-xl bg-background-muted px-3 py-2">
            <Text className="flex-1 text-caption-main text-text-neutral" numberOfLines={1}>
              {t("{{name}}님에게 답글", { name: replyTo.authorName })}
            </Text>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
              <Icon name="close-square" size={18} />
            </Pressable>
          </View>
        )}
        <CommentInput
          value={draft}
          onChangeText={setDraft}
          onSubmit={handleSubmitComment}
          placeholder={replyTo ? t("답글을 입력하세요") : t("댓글을 남겨주세요.")}
        />
      </View>

      <AppDialog
        ref={deleteDialogRef}
        title={t("이 글을 삭제하시겠습니까?")}
        description={t("삭제된 글은 복구할 수 없습니다.")}
        confirmLabel={t("삭제")}
        cancelLabel={t("취소")}
        onConfirm={confirmDeletePost}
      />

      <ReactorsModal visible={reactorsOpen} reactors={post.reactors} onClose={() => setReactorsOpen(false)} />

      <ChatImageViewer
        urls={post.imageUrls}
        startIndex={viewerIndex}
        onClose={() => setViewerIndex(null)}
      />
    </View>
  );
}
