import type { PostComment } from "@onnuri/shared";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  addComment,
  deleteComment,
  deleteTeamActivity,
  fetchTeamActivity,
  toggleLike,
} from "./api";
import { CommentThread } from "./components/CommentThread";
import { PostAuthor } from "./components/PostAuthor";
import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { FavoriteButton } from "../../shared/components/base/FavoriteButton";
import { PageIndicator } from "../../shared/components/base/PageIndicator";
import { Header } from "../../shared/components/base/Header";
import { Skeleton } from "../../shared/components/base/Skeleton";
import { CommentEmpty } from "../../shared/components/composed/CommentEmpty";
import { CommentInput } from "../../shared/components/composed/CommentInput";
import { useAuthStore } from "../../shared/store/useAuthStore";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { toTimeAgo } from "../../shared/utils/date";

export function DepartmentActivityDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useRoute<RouteProp<RootStackParamList, "DepartmentActivityDetail">>().params;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const dialogRef = useRef<AppDialogRef>(null);

  const [draft, setDraft] = useState("");
  const [photoIndex, setPhotoIndex] = useState(0);
  // 사진 폭 = 화면 폭 - 좌우 여백(px-5 = 20씩)
  const { width } = useWindowDimensions();
  const photoWidth = width - 40;
  // 답글 대상. null이면 일반 댓글이고, 값이 있으면 그 댓글의 대댓글로 달린다.
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);

  // 입력줄 왼쪽에 내 프로필 사진이 붙는다. 게스트는 user 필드 자체가 없어서 회색 원으로 남는다.
  const myAvatarUrl = useAuthStore((state) =>
    state.session.status === "authenticated" ? state.session.user.avatarUrl : null,
  );

  // 키보드가 가린 높이를 직접 받아 입력줄 아래 패딩으로 넣는다.
  // KeyboardAvoidingView를 쓰지 않는 이유: SDK 57은 edge-to-edge가 항상 켜져 있어 창이
  // 키보드만큼 줄어들지 않는다(매니페스트의 adjustResize가 무력화된다). 창 크기로 키보드를
  // 역산하는 KeyboardAvoidingView는 이 상태에서 올려야 할 높이를 0으로 계산한다.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    // iOS는 애니메이션 시작에 맞춰 올려야 따라 붙는다. Android에는 will* 이벤트가 없다.
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (event) =>
      setKeyboardHeight(event.endCoordinates.height),
    );
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const { data, isPending, isError } = useQuery({
    queryKey: ["team-activity", id],
    queryFn: () => fetchTeamActivity(id),
  });

  // 상세를 다시 받아 좋아요 수·댓글을 서버 값으로 맞춘다. 목록도 함께 새로고침한다 —
  // 조회수·댓글 수·좋아요가 카드에 그대로 보이기 때문이다.
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["team-activity", id] });
    void queryClient.invalidateQueries({ queryKey: ["team-activities"] });
  };

  const { mutate: like } = useMutation({
    mutationFn: (likedByMe: boolean) => toggleLike(id, likedByMe),
    onSuccess: refresh,
  });

  const { mutate: removePost } = useMutation({
    mutationFn: () => deleteTeamActivity(id),
    onSuccess: () => {
      // 지운 글의 상세 캐시는 버린다 — 남겨두면 뒤로 간 화면에서 잠깐 다시 보인다.
      void queryClient.invalidateQueries({ queryKey: ["team-activities"] });
      queryClient.removeQueries({ queryKey: ["team-activity", id] });
      navigation.goBack();
    },
    onError: () => {
      Alert.alert("삭제하지 못했어요", "잠시 후 다시 시도해주세요.");
    },
  });

  const { mutate: submitComment, isPending: isSubmitting } = useMutation({
    mutationFn: () => addComment(id, draft.trim(), replyTo?.id),
    onSuccess: () => {
      setDraft("");
      setReplyTo(null);
      refresh();
    },
    onError: () => {
      Alert.alert("댓글을 남기지 못했어요", "잠시 후 다시 시도해주세요.");
    },
  });

  const { mutate: removeComment } = useMutation({
    mutationFn: (commentId: string) => deleteComment(id, commentId),
    onSuccess: refresh,
    onError: () => {
      Alert.alert("댓글을 지우지 못했어요", "잠시 후 다시 시도해주세요.");
    },
  });

  // ⋮는 내 글일 때만 보이고 항목이 화면 데이터(작성자)에 의존하므로,
  // 등록부(RootNavigator)가 아니라 화면이 헤더를 단독 등록한다 (큐티나눔 상세와 같은 방식).
  const isMine = data?.isMine ?? false;
  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <Header
          variant="sub"
          title="부서활동 게시판"
          rightAction={isMine ? "more" : "none"}
          menuItems={[
            {
              icon: "edit",
              label: "수정하기",
              // 부서활동은 아직 작성·수정 API가 없어서 빈 작성 화면이 열린다 (화면도 목업).
              onPress: () => navigation.navigate("DepartmentActivityWrite"),
            },
            {
              icon: "trash-can",
              label: "삭제하기",
              onPress: () => dialogRef.current?.open(),
            },
          ]}
        />
      ),
    });
  }, [navigation, isMine]);

  const confirmDelete = () => {
    dialogRef.current?.close();
    removePost();
  };

  const handleDeletePress = (comment: PostComment) => {
    Alert.alert("댓글을 삭제할까요?", "삭제한 댓글은 되돌릴 수 없어요.", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => removeComment(comment.id),
      },
    ]);
  };

  const handleSubmit = () => {
    if (draft.trim().length === 0 || isSubmitting) return;
    submitComment();
  };

  if (isPending) {
    return (
      <View className="flex-1 bg-background-normal">
        <View className="gap-4 px-5 py-5">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-6 w-40 rounded" />
          <Skeleton className="h-20 rounded" />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-background-normal">
        <Text className="text-body-medium text-text-alternative">
          글을 불러오지 못했어요
        </Text>
      </View>
    );
  }

  // 작성 화면에서 올린 사진이 우선이고, 없으면 시드로 넣은 대표 이미지를 한 장 쓴다.
  const photos =
    data.imageUrls.length > 0
      ? data.imageUrls
      : data.coverImageUrl
        ? [data.coverImageUrl]
        : [];

  return (
    <View className="flex-1 bg-background-normal">
      {/* h-full(height:100%)을 주지 않는다 — 아래 입력줄과 형제라, 높이를 100%로 박으면
          ScrollView가 화면 전체를 차지해 입력줄이 화면 밖으로 밀린다. flex-1만 주면
          입력줄이 쓰고 남은 높이를 가져가서 키보드가 올라와도 같이 줄어든다. */}
      <ScrollView
        className="flex-1"
        contentContainerClassName="justify-start py-5 px-5"
        keyboardShouldPersistTaps="handled"
      >
        {photos.length > 0 ? (
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              // 관성이 안 붙는 느린 스와이프에도 점이 따라오도록 onScroll로 계산 (셀 소식 상세와 동일)
              scrollEventThrottle={16}
              onScroll={(event) =>
                setPhotoIndex(
                  Math.round(event.nativeEvent.contentOffset.x / photoWidth),
                )
              }
            >
              {photos.map((url) => (
                <Image
                  key={url}
                  source={{ uri: url }}
                  style={{ width: photoWidth, aspectRatio: 1 }}
                  className="bg-background-assistive"
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
            {photos.length > 1 && (
              <PageIndicator
                className="mt-2.5"
                count={photos.length}
                current={photoIndex}
              />
            )}
          </View>
        ) : (
          <View className="w-full h-90 bg-background-assistive" />
        )}
        <PostAuthor
          authorName={data.authorName}
          department={data.department}
          categoryName={data.teamName}
          date={`${data.dateLabel} · ${toTimeAgo(data.createdAt)}`}
        />
        {/* 내용 */}
        <View className="flex justify-start">
          <Text className="mt-2 text-heading-medium text-text-normal">
            {data.title}
          </Text>
          <Text className="mt-2 text-body-medium text-text-neutral">
            {data.content}
          </Text>
          <FavoriteButton
            className="mt-5"
            count={data.likeCount}
            favorited={data.likedByMe}
            onPress={() => like(data.likedByMe)}
          />
        </View>
        <View className="mt-5 border-t border-t-text-assistive">
          {/* 대댓글은 수에서 뺀다 — 서버가 최상위만 세서 목록 카드와 같은 값이 된다. */}
          <Text className="my-4 text-body-main text-text-normal">
            댓글 {data.comments.length}
          </Text>
          {data.comments.length === 0 ? (
            <CommentEmpty />
          ) : (
            data.comments.map((comment) => (
              <CommentThread
                key={comment.id}
                comment={comment}
                onReplyPress={setReplyTo}
                onDeletePress={handleDeletePress}
              />
            ))
          )}
        </View>
      </ScrollView>
      {/* 키보드가 올라오면 그 높이만큼 아래를 띄운다. 이때 내비게이션 바 인셋은 더하지
          않는다 — 키보드가 그 자리를 이미 덮고 있어서 두 번 띄우면 입력줄이 떠 보인다.
          여백·테두리를 className이 아니라 style로 주는 이유: 같은 View에 className과
          style을 같이 걸면 NativeWind가 만든 스타일이 이겨서 style의 paddingBottom이
          무시된다 (CommentInput의 함수형 style 주석과 같은 문제). 키보드 높이는 매번
          달라지는 값이라 className으로 만들 수 없으므로, 이 컨테이너는 전부 style로 준다.
          셀 소식 상세도 여백·테두리를 style로 주고 있다. */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: (keyboardHeight || insets.bottom) + 8,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.text.assistive,
          backgroundColor: colors.background.normal,
        }}
      >
        {/* 답글 모드일 때만 누구에게 다는 중인지 보여주고 빠져나갈 길을 준다. */}
        {replyTo && (
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-body-small text-text-alternative">
              {replyTo.authorName}님에게 답글
            </Text>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
              <Text className="text-body-small text-text-alternative">취소</Text>
            </Pressable>
          </View>
        )}
        <CommentInput
          value={draft}
          onChangeText={setDraft}
          onSubmit={handleSubmit}
          avatarUrl={myAvatarUrl}
          placeholder={replyTo ? "답글을 입력하세요" : "댓글을 입력하세요"}
        />
      </View>

      <AppDialog
        ref={dialogRef}
        title="정말 삭제하시겠습니까?"
        description="삭제된 데이터는 복구할 수 없습니다."
        confirmLabel="확인"
        cancelLabel="취소"
        onConfirm={confirmDelete}
      />
    </View>
  );
}
