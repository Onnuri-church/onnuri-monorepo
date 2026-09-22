import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useLayoutEffect, useRef, useState } from "react";
import { Image, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { FavoriteButton } from "../../shared/components/base/FavoriteButton";
import { Header } from "../../shared/components/base/Header";
import { CommentEmpty } from "../../shared/components/composed/CommentEmpty";
import { CommentInput } from "../../shared/components/composed/CommentInput";
import { CommentItem } from "../../shared/components/composed/CommentItem";
import { colors } from "../../shared/theme/tokens";
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

// 셀 소식 상세 (시안: 사진 + 작성자 + 제목/본문 + 하트 + 댓글) — /posts/cell-news/:id 실데이터.
export function CellNewsDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "CellNewsDetail">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { cellId, newsId } = route.params;

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

  // ⋮는 권한이 있을 때만 보이고 항목이 화면 데이터에 의존하므로 화면이 헤더를 단독 등록한다
  // (QtBoardDetail과 같은 패턴 — 등록부에는 headerShown: true만 둔다).
  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <Header
          variant="sub"
          title={cell?.name ?? "셀 소식"}
          rightAction={canEdit ? "more" : "none"}
          menuItems={[
            {
              icon: "edit",
              label: "수정하기",
              onPress: () => navigation.navigate("CellNewsWrite", { cellId, newsId }),
            },
            {
              icon: "trash-can",
              label: "삭제하기",
              onPress: () => deleteDialogRef.current?.open(),
            },
          ]}
        />
      ),
    });
  }, [navigation, cell?.name, canEdit, cellId, newsId]);

  const confirmDelete = () => {
    deleteDialogRef.current?.close();
    deleteNews.mutate(newsId, { onSuccess: () => navigation.goBack() });
  };

  const handleCommentSubmit = () => {
    const content = commentDraft.trim();
    if (!content || addComment.isPending) return;
    addComment.mutate(content, { onSuccess: () => setCommentDraft("") });
  };

  if (!news) {
    return (
      <View className="flex-1 items-center justify-center bg-background-normal">
        <Text className="text-body-medium text-text-alternative">
          {isLoading ? "소식을 불러오고 있어요." : "소식을 찾을 수 없어요."}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-normal">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView keyboardShouldPersistTaps="handled">
          {/* 소식 사진 (시안 362x360 한 장 영역) — 여러 장이면 첫 장만. 없으면 회색 자리 유지 */}
          {news.imageUrls.length > 0 ? (
            <Image
              source={{ uri: news.imageUrls[0] }}
              className="mx-5 mt-1 aspect-square"
              resizeMode="cover"
            />
          ) : (
            <View className="mx-5 mt-1 aspect-square bg-background-assistive" />
          )}

          <View className="px-5 pt-4">
            <View className="flex-row items-center gap-2">
              {/* TODO(사진): 작성자 프로필 placeholder (시안 42 — 40으로 근사) */}
              <View className="h-10 w-10 rounded-full bg-background-assistive" />
              <View>
                <Text className="text-heading-small text-text-normal">{news.authorName}</Text>
                <Text className="text-body-small text-text-alternative">
                  {news.dateLabel} · {toTimeAgo(news.createdAt)}
                </Text>
              </View>
            </View>

            <Text className="mt-4 text-heading-medium text-text-normal">{news.title}</Text>
            <Text className="mt-2 text-body-medium text-text-neutral">{news.content}</Text>

            <FavoriteButton
              className="mt-6"
              count={news.likeCount}
              favorited={news.likedByMe}
              onPress={() => toggleLike.mutate(news.likedByMe)}
            />
          </View>

          <View
            className="mt-4 px-5 pb-6 pt-4"
            style={{
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.background.assistive,
            }}
          >
            <Text className="text-body-main text-text-normal">댓글 {news.comments.length}</Text>
            {news.comments.length === 0 ? (
              <CommentEmpty />
            ) : (
              <View className="mt-2">
                {news.comments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    authorName={comment.authorName}
                    timeAgo={toTimeAgo(comment.createdAt)}
                    content={comment.content}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        <View
          className="px-5 pt-3"
          style={{
            paddingBottom: insets.bottom + 8,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.background.assistive,
          }}
        >
          <CommentInput
            value={commentDraft}
            onChangeText={setCommentDraft}
            onSubmit={handleCommentSubmit}
          />
        </View>
      </KeyboardAvoidingView>

      <AppDialog
        ref={deleteDialogRef}
        title="정말 삭제하시겠습니까?"
        description="삭제된 데이터는 복구할 수 없습니다."
        confirmLabel="확인"
        cancelLabel="취소"
        onConfirm={confirmDelete}
      />
    </View>
  );
}
