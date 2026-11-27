import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { PostComment } from "@onnuri/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "../../shared/components/base/Avatar";
import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { FavoriteButton } from "../../shared/components/base/FavoriteButton";
import { Header } from "../../shared/components/base/Header";
import { PageIndicator } from "../../shared/components/base/PageIndicator";
import { CommentEmpty } from "../../shared/components/composed/CommentEmpty";
import { useKeyboardHeight } from "../../shared/hooks/useKeyboardHeight";
import { useNewItems } from "../../shared/hooks/useNewItems";
import { CommentInput } from "../../shared/components/composed/CommentInput";
import { CommentThread, PendingCommentItem } from "../../shared/components/composed/CommentThread";
import { useCommentScroll } from "../../shared/hooks/useCommentScroll";
import {
  flattenCommentIds,
  insertComment,
  usePendingComments,
} from "../../shared/hooks/usePendingComments";
import { useThemeColors } from "../../shared/theme/useThemeColors";
import type { RootStackParamList } from "../../shared/types/navigation";
import { toTimeAgo } from "../../shared/utils/date";
import { useMe } from "../profile/useMe";
import {
  useAddCellNewsComment,
  useCell,
  useCellNewsDetail,
  useDeleteCellNews,
  useToggleCellNewsLike,
} from "./api";
import { canManageCell } from "./cellDetail";
import { useBlockConfirm } from "../block/useBlockConfirm";
import { useReport } from "../report/useReport";
import { LinkifiedText } from "../team-space/components/LinkifiedText";
import { ChatImageViewer } from "../chat/components/ChatImageViewer";
import { usePhotoRatio } from "../../shared/hooks/usePhotoRatio";

// 셀 소식 상세 (시안: 사진 + 작성자 + 제목/본문 + 하트 + 댓글) — /posts/cell-news/:id 실데이터.
export function CellNewsDetailScreen() {
  const { t } = useTranslation();
  // 남의 댓글 "차단" (SCRUM-198) — 차단하면 캐시를 다시 받아 그 사람 댓글이 빠진다.
  const { requestBlock, dialog: blockDialog, canBlock } = useBlockConfirm();
  // 남의 글·댓글 "신고" (SCRUM-199)
  const { openReport, sheet: reportSheet } = useReport();
  const themeColors = useThemeColors();
  const route = useRoute<RouteProp<RootStackParamList, "CellNewsDetail">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { cellId, newsId, commentId } = route.params;

  const cell = useCell(cellId);
  const { data: news, isLoading } = useCellNewsDetail(newsId);
  const deleteDialogRef = useRef<AppDialogRef>(null);

  // 수정/삭제 메뉴: 내 글이거나 셀장·관리자 (서버도 같은 규칙으로 거른다).
  const me = useMe();
  const canEdit = news?.isMine === true || canManageCell(cellId, me);

  const deleteNews = useDeleteCellNews(cellId);
  const addComment = useAddCellNewsComment(newsId);
  const toggleLike = useToggleCellNewsLike(newsId);
  const [commentDraft, setCommentDraft] = useState("");
  // 답글 대상 — 있으면 입력줄 위에 "OO님에게 답글"이 붙고 그 댓글의 답글로 달린다 (SCRUM-216).
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);
  // 댓글 즉시 표시·등장 효과·알림 진입 강조 (SCRUM-215)
  const pendingComments = usePendingComments();
  const { isNew, markSeen } = useNewItems(news ? flattenCommentIds(news.comments) : undefined);
  const scrollRef = useRef<ScrollView>(null);
  const commentScroll = useCommentScroll(scrollRef, commentId, news?.comments);
  const queryClient = useQueryClient();

  // 사진 여러 장 넘겨보기 — 시안의 정사각 영역(좌우 20 여백) 안에서 가로 페이징한다.
  const { width } = useWindowDimensions();
  const photoWidth = width - 40;
  // 사진 칸은 첫 사진의 실제 비율을 따르고 사진은 자르지 않는다 (SCRUM-306 — usePhotoRatio 주석 참고).
  const photoRatio = usePhotoRatio(news?.imageUrls[0]);
  const [photoIndex, setPhotoIndex] = useState(0);
  // 누른 사진부터 크게 보기 — null이면 닫힘
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // ⋮는 권한이 있을 때만 보이고 항목이 화면 데이터에 의존하므로 화면이 헤더를 단독 등록한다
  // (QtBoardDetail과 같은 패턴 — 등록부에는 headerShown: true만 둔다).
  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <Header
          variant="sub"
          title={cell?.name ?? t("셀 소식")}
          rightAction={canEdit ? "more" : "none"}
          menuItems={[
            {
              icon: "edit",
              label: t("수정하기"),
              onPress: () => navigation.navigate("CellNewsWrite", { cellId, newsId }),
            },
            {
              icon: "trash-can",
              label: t("삭제하기"),
              onPress: () => deleteDialogRef.current?.open(),
            },
          ]}
        />
      ),
    });
  }, [navigation, cell?.name, canEdit, cellId, newsId, t]);

  const confirmDelete = () => {
    deleteDialogRef.current?.close();
    deleteNews.mutate(newsId, { onSuccess: () => navigation.goBack() });
  };

  // 누르는 즉시 흐린 댓글을 먼저 그리고 입력칸을 비운다 — 서버가 받으면 같은 자리에서 진짜 댓글로
  // 바뀌고, 실패하면 쓴 내용을 입력칸에 되돌린다 (SCRUM-215).
  const handleCommentSubmit = async () => {
    const content = commentDraft.trim();
    if (!content) return;
    const parentId = replyTo?.id ?? null;
    const localId = pendingComments.add(content, parentId);
    setCommentDraft("");
    setReplyTo(null);
    commentScroll.scrollToNew(parentId);
    try {
      const created = await addComment.mutateAsync({ content, parentId: parentId ?? undefined });
      markSeen(created.id);
      queryClient.setQueryData<{ comments: PostComment[] }>(["cell-news-detail", newsId], (prev) =>
        prev ? { ...prev, comments: insertComment(prev.comments, created, parentId) } : prev,
      );
      pendingComments.remove(localId);
    } catch {
      pendingComments.remove(localId);
      setCommentDraft((prev) => prev || content);
      Alert.alert(t("댓글을 등록하지 못했어요"), t("잠시 후 다시 시도해주세요."));
    }
  };

  if (!news) {
    return (
      <View className="flex-1 items-center justify-center bg-background-normal">
        <Text className="text-body-medium text-text-alternative">
          {isLoading ? t("소식을 불러오고 있어요.") : t("소식을 찾을 수 없어요.")}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-normal">
      <View style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          onLayout={commentScroll.onScrollLayout}
          keyboardShouldPersistTaps="handled"
        >
          {/* 소식 사진 (시안 362x360 영역) — 여러 장이면 옆으로 넘겨 보고 아래 점으로 위치를 찍는다.
              없으면 회색 자리 유지 */}
          {news.imageUrls.length > 0 ? (
            <View className="mx-5 mt-1">
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                // 관성이 안 붙는 느린 스와이프에도 점이 따라오도록 onScroll로 계산 (ImagePager와 동일)
                scrollEventThrottle={16}
                onScroll={(event) =>
                  setPhotoIndex(Math.round(event.nativeEvent.contentOffset.x / photoWidth))
                }
              >
                {/* 사진은 자르지 않고 전체를 보여준다(contain). 누르면 크게 본다 (SCRUM-306). */}
                {news.imageUrls.map((url, index) => (
                  <Pressable key={url} onPress={() => setViewerIndex(index)}>
                    <Image
                      source={{ uri: url }}
                      className="bg-background-muted"
                      style={{ width: photoWidth, aspectRatio: photoRatio }}
                      resizeMode="contain"
                    />
                  </Pressable>
                ))}
              </ScrollView>
              {news.imageUrls.length > 1 && (
                <PageIndicator
                  className="mt-2.5"
                  count={news.imageUrls.length}
                  current={photoIndex}
                />
              )}
            </View>
          ) : (
            <View className="mx-5 mt-1 aspect-square bg-background-assistive" />
          )}

          <View className="px-5 pt-4">
            <View className="flex-row items-center gap-2">
              <Avatar imageUrl={news.authorAvatarUrl} size={40} />
              <View>
                <Text className="text-heading-small text-text-normal">{news.authorName}</Text>
                <Text className="text-body-small text-text-alternative">
                  {news.dateLabel} · {toTimeAgo(news.createdAt)}
                </Text>
              </View>
            </View>

            <Text className="mt-4 text-heading-medium text-text-normal">{news.title}</Text>
            <LinkifiedText text={news.content} className="mt-2 text-body-medium text-text-neutral" />

            <FavoriteButton
              className="mt-6"
              count={news.likeCount}
              favorited={news.likedByMe}
              onPress={() => toggleLike.mutate(news.likedByMe)}
            />
          </View>

          <View
            className="mt-4 px-5 pb-6 pt-4"
            onLayout={commentScroll.onSectionLayout}
            style={{
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: themeColors.background.assistive,
            }}
          >
            <Text className="text-body-main text-text-normal">
              {t("댓글 {{count}}", {
                count: news.comments.length + pendingComments.topLevel.length,
              })}
            </Text>
            {news.comments.length + pendingComments.topLevel.length === 0 ? (
              <CommentEmpty />
            ) : (
              <View className="mt-2">
                {news.comments.map((comment) => (
                  <View key={comment.id} onLayout={commentScroll.onThreadLayout(comment.id)}>
                    <CommentThread
                      comment={comment}
                      isNew={isNew}
                      pendingReplies={pendingComments.repliesOf(comment.id)}
                      highlightId={commentScroll.highlightId}
                      onReplyPress={(target) => setReplyTo(target)}
                      onBlockPress={
                        canBlock
                          ? (target) =>
                              requestBlock({ userId: target.authorId, name: target.authorName })
                          : undefined
                      }
                      onReportPress={
                        canBlock
                          ? (target) => openReport({ targetType: "COMMENT", targetId: target.id })
                          : undefined
                      }
                    />
                  </View>
                ))}
                {pendingComments.topLevel.map((item) => (
                  <PendingCommentItem key={item.localId} content={item.content} />
                ))}
                {blockDialog}
                {reportSheet}
              </View>
            )}
          </View>
        </ScrollView>

        <View
          className="px-5 pt-3"
          style={{
            // 키보드가 올라오면 그 높이만큼 띄운다 — 이때 내비 바 인셋은 더하지 않는다 (키보드가 그 자리를 덮는다).
            paddingBottom: (keyboardHeight || insets.bottom) + 8,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: themeColors.background.assistive,
          }}
        >
          {/* 답글 모드일 때만 누구에게 다는 중인지 보여주고 빠져나갈 길을 준다 (SCRUM-216) */}
          {replyTo && (
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-body-small text-text-alternative">
                {t("{{name}}님에게 답글", { name: replyTo.authorName })}
              </Text>
              <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
                <Text className="text-body-small text-text-alternative">{t("취소")}</Text>
              </Pressable>
            </View>
          )}
          <CommentInput
            value={commentDraft}
            onChangeText={setCommentDraft}
            onSubmit={() => void handleCommentSubmit()}
            placeholder={replyTo ? t("답글을 입력하세요") : undefined}
          />
        </View>
      </View>

      <AppDialog
        ref={deleteDialogRef}
        title={t("정말 삭제하시겠습니까?")}
        description={t("삭제된 데이터는 복구할 수 없습니다.")}
        confirmLabel={t("확인")}
        cancelLabel={t("취소")}
        onConfirm={confirmDelete}
      />
      <ChatImageViewer
        urls={news.imageUrls}
        startIndex={viewerIndex}
        onClose={() => setViewerIndex(null)}
      />
    </View>
  );
}
