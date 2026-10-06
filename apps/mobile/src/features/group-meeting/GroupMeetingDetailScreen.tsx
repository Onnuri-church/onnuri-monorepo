import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import type { GroupMeetingMember } from "@onnuri/shared";
import { useEffect, useRef, useState } from "react";
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

import * as ImagePicker from "expo-image-picker";

import { uploadImage } from "../../shared/api/upload";
import {
  fetchGroupMeetingDetail,
  useAddGroupMeetingComment,
  useAddGroupMeetingPhotos,
  useCancelGroupMeetingJoin,
  useDecideGroupMeetingMember,
  useDeleteGroupMeetingComment,
  useJoinGroupMeeting,
} from "./api";
import { Avatar } from "../../shared/components/base/Avatar";
import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { Button } from "../../shared/components/base/Button";
import { Chip } from "../../shared/components/base/Chip";
import { Icon } from "../../shared/components/base/Icon";
import { InfoBox } from "../../shared/components/base/InfoBox";
import { Skeleton } from "../../shared/components/base/Skeleton";
import { Thumbnail } from "../../shared/components/base/Thumbnail";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { toTimeAgo } from "../../shared/utils/date";
import { CommentInput } from "../../shared/components/composed/CommentInput";
import { CommentItem } from "../../shared/components/composed/CommentItem";
import { useMe } from "../profile/useMe";

// 시안 확정값은 402pt 프레임 기준이다. 콘텐츠 폭 362 = 402 - 20*2 이므로
// 폭을 박지 않고 좌우 여백 20만 주면 402에서 362가 그대로 나오고 다른 기기에도 맞는다.
const CONTENT_PADDING = 20;

// 활동 사진 블록 362x331 = 큰 사진 200 + 간격 10 + 썸네일 95 + "모두 보기" 26.
const LEAD_PHOTO_RATIO = 362 / 200;
const THUMB_RATIO = 112 / 95;
// 큰 사진과 썸네일 줄 사이 간격 10은 mt-2.5로, 썸네일 사이 간격 13은 열 수 계산에도 쓰여 상수로 둔다.
const THUMB_GAP = 13;
// 402pt에서 3열이면 (362 - 13*2) / 3 = 112. 이 크기를 기준으로 넓어지면 열을 늘린다.
const MIN_THUMB_WIDTH = 112;
const MIN_THUMB_COLUMNS = 3;

// 폰 최대 폭(430pt)에서 나오는 높이로 상한을 둔다 — 폰에서는 비율 그대로이고,
// 넓은 창에서는 사진 하나가 화면을 다 먹지 않게 높이가 멈춘다.
const PHONE_MAX_WIDTH = 430;

const LEAD_PHOTO_MAX_HEIGHT = Math.round(
  (PHONE_MAX_WIDTH - CONTENT_PADDING * 2) / LEAD_PHOTO_RATIO,
);

// 히어로는 확정 수치가 없어 시안에서 잰 추정값이다.
const HERO_RATIO = 390 / 251;
const HERO_MAX_HEIGHT = Math.round(PHONE_MAX_WIDTH / HERO_RATIO);

// 타일 크기를 유지한 채 열 수를 늘린다 — 폭이 커져도 썸네일이 같이 부풀지 않는다.
function getThumbLayout(screenWidth: number) {
  const available = screenWidth - CONTENT_PADDING * 2;
  const columns = Math.max(
    MIN_THUMB_COLUMNS,
    Math.floor((available + THUMB_GAP) / (MIN_THUMB_WIDTH + THUMB_GAP)),
  );
  return { columns, width: (available - THUMB_GAP * (columns - 1)) / columns };
}

export function GroupMeetingDetailScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, "GroupMeetingDetail">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [comment, setComment] = useState("");

  // 입력줄을 화면 하단에 고정하면서 키보드가 가린 높이를 직접 받아 아래 패딩으로 넣는다.
  // KeyboardAvoidingView를 쓰지 않는 이유는 부서활동 상세와 같다 — SDK 57은 edge-to-edge가
  // 항상 켜져 있어 창이 줄어들지 않아서, 창 크기로 역산하는 방식은 0으로 계산된다.
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
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
  const { width } = useWindowDimensions();
  const thumb = getThumbLayout(width);

  const me = useMe();
  const addComment = useAddGroupMeetingComment(params.id);
  const deleteComment = useDeleteGroupMeetingComment(params.id);
  const join = useJoinGroupMeeting(params.id);
  const cancelJoin = useCancelGroupMeetingJoin(params.id);
  const decideMember = useDecideGroupMeetingMember(params.id);
  const addPhotos = useAddGroupMeetingPhotos(params.id);
  const [photoUploading, setPhotoUploading] = useState(false);

  // 활동 사진 추가 — 승인된 참여자·소그룹장·관리자 (서버도 같은 규칙으로 거른다).
  const handlePhotoAddPress = async () => {
    if (photoUploading) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    });
    if (result.canceled) return;
    setPhotoUploading(true);
    try {
      const imageUrls = await Promise.all(result.assets.map((asset) => uploadImage(asset.uri)));
      await addPhotos.mutateAsync(imageUrls);
    } catch {
      Alert.alert("사진 업로드 실패", "잠시 후 다시 시도해주세요.");
    } finally {
      setPhotoUploading(false);
    }
  };

  // 거절은 신청을 지우는 동작이라 다이얼로그로 한 번 확인한다 (셀원 삭제와 같은 패턴).
  const rejectDialogRef = useRef<AppDialogRef>(null);
  const [pendingReject, setPendingReject] = useState<GroupMeetingMember | null>(null);

  const handleDecide = (userId: string, status: "APPROVED" | "REJECTED") => {
    if (decideMember.isPending) return;
    decideMember.mutate(
      { userId, status },
      { onError: () => Alert.alert("처리 실패", "잠시 후 다시 시도해주세요.") },
    );
  };

  const handleRejectPress = (member: GroupMeetingMember) => {
    setPendingReject(member);
    rejectDialogRef.current?.open();
  };

  const confirmReject = () => {
    rejectDialogRef.current?.close();
    if (pendingReject) handleDecide(pendingReject.id, "REJECTED");
  };

  const {
    data: meeting,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["group-meetings", params.id],
    queryFn: () => fetchGroupMeetingDetail(params.id),
  });

  const handleCommentSubmit = () => {
    const content = comment.trim();
    if (!content || addComment.isPending) return;
    if (!me) {
      Alert.alert("로그인이 필요해요", "댓글은 로그인 후 남길 수 있어요.");
      return;
    }
    addComment.mutate(content, { onSuccess: () => setComment("") });
  };

  // 하단 버튼 — 참여는 승인제: 신청(PENDING) → 소그룹장/관리자 승인. 상태별로 문구가 바뀐다.
  const handleJoinPress = () => {
    if (!meeting || join.isPending || cancelJoin.isPending) return;
    if (!me) {
      Alert.alert("로그인이 필요해요", "참여 신청은 로그인 후 할 수 있어요.");
      return;
    }
    const mutation = meeting.myStatus === null || meeting.myStatus === "REJECTED" ? join : cancelJoin;
    mutation.mutate(undefined, {
      onError: (error) => {
        const message =
          (error as { response?: { data?: { message?: string } } }).response?.data?.message;
        Alert.alert("요청 실패", message ?? "잠시 후 다시 시도해주세요.");
      },
    });
  };

  if (isPending) {
    return (
      <View className="flex-1 bg-background-normal">
        <View
          className="w-full bg-text-assistive"
          style={{ aspectRatio: HERO_RATIO, maxHeight: HERO_MAX_HEIGHT }}
        />
        <View className="gap-3 px-4 py-4">
          <Skeleton className="h-5 w-32 rounded" />
          <Skeleton className="h-6 w-56 rounded" />
          <Skeleton className="h-36 w-full rounded-2xl" />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-background-normal">
        <Text className="text-body-medium text-text-alternative">모임을 불러오지 못했어요</Text>
      </View>
    );
  }

  const [leadPhoto, ...restPhotos] = meeting.photos;
  // 한 줄에 들어가는 만큼만 보여준다 — 화면이 넓어 열이 늘면 "+N" 대신 사진을 더 채우는 게 맞다.
  const visiblePhotos = restPhotos.slice(0, thumb.columns);
  // 마지막 칸은 사진 한 장이 아니라 "나머지 전부"를 뜻하므로, 그 칸에 가려지는 사진까지 센다.
  // 402pt(3열)에서 12장이면 12-1(큰 사진)-2(낱장 썸네일) = 9로 시안의 "+9"가 그대로 나온다.
  const remainingCount = meeting.photoCount - 1 - (visiblePhotos.length - 1);
  const hasMore = meeting.photoCount - 1 > visiblePhotos.length;

  return (
    <View className="flex-1 bg-background-normal">
      <ScrollView contentContainerClassName="pb-6">
        {meeting.heroImageUrl ? (
          <Image
            source={{ uri: meeting.heroImageUrl }}
            style={{ aspectRatio: HERO_RATIO, width: "100%", maxHeight: HERO_MAX_HEIGHT }}
            resizeMode="cover"
          />
        ) : (
          <View
            className="w-full bg-text-assistive"
            style={{ aspectRatio: HERO_RATIO, maxHeight: HERO_MAX_HEIGHT }}
          />
        )}

        {/* 거절 안내 — 시안: 상태 라벨 위 테두리 박스. 재신청은 아래 버튼으로 그대로 가능하다. */}
        {meeting.myStatus === "REJECTED" && (
          <View
            className="mt-4 flex-row items-center gap-2.5 rounded-xl border border-text-assistive px-5 py-2"
            style={{ marginHorizontal: CONTENT_PADDING }}
          >
            <View className="h-2 w-2 rounded-full bg-semantic-danger" />
            <Text className="text-body-small text-text-neutral">
              아쉽지만 이번 소그룹 참여가 어려워요
            </Text>
          </View>
        )}

        <View className="gap-2 pt-4" style={{ paddingHorizontal: CONTENT_PADDING }}>
          <View className="flex-row items-center gap-2">
            <Text className="text-label-medium text-primary-normal">{meeting.statusLabel}</Text>
            <Text className="text-label-medium text-text-alternative">{meeting.periodLabel}</Text>
          </View>
          <View className="flex-row items-center justify-between gap-2">
            {/* 긴 제목이 수정 버튼을 밀어내지 않게 제목 쪽만 줄어든다. */}
            <Text className="flex-1 text-heading-main text-text-normal">{meeting.title}</Text>
            {/* 소그룹장·관리자의 수정 진입 — 활동 사진의 +추가와 같은 회색 알약 모양 */}
            {meeting.canManage && (
              <Pressable
                className="rounded-md bg-background-muted px-2 py-0.5"
                onPress={() =>
                  navigation.navigate("GroupMeetingForm", { meetingId: params.id })
                }
              >
                <Text className="text-body-small text-text-neutral">수정</Text>
              </Pressable>
            )}
          </View>
          {meeting.description !== "" && (
            <Text className="text-body-medium text-text-neutral">{meeting.description}</Text>
          )}
        </View>

        <View className="pt-6" style={{ paddingHorizontal: CONTENT_PADDING }}>
          <InfoBox
            rows={[
              { icon: "calendar", label: "모임일", value: meeting.schedule },
              { icon: "place", label: "장소", value: meeting.place },
              { icon: "card", label: "비용", value: meeting.cost },
            ]}
          />
        </View>

        <View className="pt-6" style={{ paddingHorizontal: CONTENT_PADDING }}>
          <Text className="text-heading-small text-text-normal">참여 멤버</Text>
          {/* 행 전체가 참여멤버 명단으로 가는 버튼이다 (시안의 참여멤버 보기 화면). */}
          <Pressable
            className="mt-3 flex-row items-center gap-3"
            onPress={() =>
              navigation.navigate("GroupMeetingMembers", { meetingId: params.id })
            }
          >
            {/* 사진 없는 멤버는 회색 기본 원으로 채운다(합쳐서 최대 3개) — 이 줄이 명단으로
                가는 버튼인데, 전원이 사진이 없으면 아바타 줄이 통째로 사라져 눌리는 줄인지
                알 수 없었다. 끝의 화살표도 같은 이유다. */}
            <View className="flex-row">
              {meeting.participantAvatarUrls.slice(0, 3).map((url, index) => (
                <Image
                  key={url}
                  source={{ uri: url }}
                  className={index === 0 ? "h-8 w-8 rounded-full" : "-ml-2 h-8 w-8 rounded-full"}
                />
              ))}
              {Array.from({
                length: Math.max(
                  0,
                  Math.min(meeting.participantCount, 3) -
                    Math.min(meeting.participantAvatarUrls.length, 3),
                ),
              }).map((_, index) => (
                <View
                  key={`placeholder-${index}`}
                  className={
                    index === 0 && meeting.participantAvatarUrls.length === 0
                      ? ""
                      : "-ml-2 rounded-full border border-background-normal"
                  }
                >
                  <Avatar imageUrl={null} size={32} />
                </View>
              ))}
            </View>
            <Text className="text-body-small text-text-neutral">
              총 {meeting.participantCount}명
            </Text>
            <View className="ml-auto">
              <Icon name="expand-right" color={colors.icon.normal} />
            </View>
          </Pressable>
        </View>

        {/* 신청 대기 — 소그룹장·관리자에게만 보인다 (자체 디자인: 셀원 관리 행 패턴 + 알약 버튼,
            시안이 나오면 그 형태로 교체). */}
        {meeting.canManage && meeting.pendingMembers.length > 0 && (
          <View className="pt-6" style={{ paddingHorizontal: CONTENT_PADDING }}>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-heading-small text-text-normal">신청 대기</Text>
              <Text className="text-heading-small text-primary-normal">
                {meeting.pendingMembers.length}
              </Text>
            </View>
            <View className="mt-1">
              {meeting.pendingMembers.map((member) => (
                <View
                  key={member.id}
                  className="flex-row items-center justify-between border-b border-background-assistive py-2.5"
                >
                  <View className="flex-row items-center gap-4">
                    <Avatar imageUrl={member.avatarUrl} size={40} />
                    <Text className="text-body-main text-text-normal">{member.name}</Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Pressable
                      className="h-8 items-center justify-center rounded-lg bg-primary-normal px-3"
                      onPress={() => handleDecide(member.id, "APPROVED")}
                      style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
                    >
                      <Text className="text-body-small text-text-disable">승인</Text>
                    </Pressable>
                    <Pressable
                      className="h-8 items-center justify-center rounded-lg border border-semantic-danger px-3"
                      onPress={() => handleRejectPress(member)}
                      style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
                    >
                      <Text className="text-body-small text-semantic-danger">거절</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 활동 사진 — 승인된 참여자·소그룹장·관리자는 빈 상태에서도 올릴 수 있어야 해서
            사진이 없어도 섹션을 그린다 (그 외에는 사진이 있을 때만). */}
        {(leadPhoto || meeting.canManage || meeting.myStatus === "APPROVED") && (
          <View className="pt-6" style={{ paddingHorizontal: CONTENT_PADDING }}>
            <View className="flex-row items-center justify-between">
              <Text className="text-heading-small text-text-normal">활동 사진</Text>
              {(meeting.canManage || meeting.myStatus === "APPROVED") && (
                <Pressable
                  onPress={() => void handlePhotoAddPress()}
                  disabled={photoUploading}
                  hitSlop={8}
                >
                  <Text className="text-body-small text-primary-normal">
                    {photoUploading ? "올리는 중..." : "사진 추가"}
                  </Text>
                </Pressable>
              )}
            </View>
            {leadPhoto ? (
              <>
                <Thumbnail
                  className="mt-3"
                  source={{ uri: leadPhoto.url }}
                  ratio={LEAD_PHOTO_RATIO}
                  caption={leadPhoto.caption ?? undefined}
                  style={{ maxHeight: LEAD_PHOTO_MAX_HEIGHT }}
                  onPress={() =>
                    navigation.navigate("GroupMeetingPhoto", { meetingId: params.id, index: 0 })
                  }
                />
                <View className="mt-2.5 flex-row flex-wrap" style={{ gap: THUMB_GAP }}>
                  {visiblePhotos.map((photo, index) => (
                    <Thumbnail
                      key={photo.id}
                      style={{ width: thumb.width }}
                      ratio={THUMB_RATIO}
                      source={{ uri: photo.url }}
                      overlayCount={
                        hasMore && index === visiblePhotos.length - 1 ? remainingCount : undefined
                      }
                      onPress={() =>
                        navigation.navigate("GroupMeetingPhoto", {
                          meetingId: params.id,
                          index: index + 1,
                        })
                      }
                    />
                  ))}
                </View>
                <Pressable
                  className="mt-3 flex-row items-center justify-center gap-1"
                  onPress={() =>
                    navigation.navigate("GroupMeetingGallery", { meetingId: params.id })
                  }
                >
                  <Text className="text-label-small text-text-alternative">
                    사진 {meeting.photoCount}장 모두 보기
                  </Text>
                  {/* 오른쪽 화살표 아이콘이 세트에 없어 back(왼쪽)을 뒤집어 쓴다 —
                      손으로 새 SVG를 그리면 획 굵기·그리드가 세트와 어긋난다. */}
                  <View style={{ transform: [{ rotate: "180deg" }] }}>
                    <Icon name="back" size={16} color={colors.icon.normal} />
                  </View>
                </Pressable>
              </>
            ) : (
              <Pressable
                className="mt-3 h-24 items-center justify-center rounded-2xl border border-dashed border-background-assistive"
                onPress={() => void handlePhotoAddPress()}
                disabled={photoUploading}
                style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
              >
                <Text className="text-body-regular text-text-alternative">
                  {photoUploading ? "올리는 중..." : "+ 첫 활동 사진을 올려보세요"}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        <View className="pt-6" style={{ paddingHorizontal: CONTENT_PADDING }}>
          <Text className="text-heading-small text-text-normal">
            댓글 {meeting.comments.length}
          </Text>
          <View className="mt-2">
            {meeting.comments.map((item) => (
              <CommentItem
                key={item.id}
                authorName={item.authorName}
                timeAgo={toTimeAgo(item.createdAt)}
                content={item.content}
                avatarUrl={item.authorAvatarUrl}
                onDeletePress={
                  item.isMine ? () => deleteComment.mutate(item.id) : undefined
                }
              />
            ))}
          </View>
        </View>

        {/* 참여 버튼 — 소그룹장/관리자는 신청 대상이 아니라 숨긴다 */}
        {!meeting.canManage && (
          <View className="pt-6" style={{ paddingHorizontal: CONTENT_PADDING }}>
            <Button
              label={
                meeting.myStatus === "PENDING"
                  ? "신청 취소하기"
                  : meeting.myStatus === "APPROVED"
                    ? "탈퇴하기"
                    : meeting.status === "closed"
                      ? "모집이 마감됐어요"
                      : "참여 신청하기"
              }
              disabled={meeting.status === "closed" && meeting.myStatus === null}
              loading={join.isPending || cancelJoin.isPending}
              onPress={handleJoinPress}
            />
          </View>
        )}
      </ScrollView>

      {/* 댓글 입력줄 — 스크롤 안에 두면 안드로이드 edge-to-edge에서 내비 바에 깔려 닿을 수
          없었다(삼성 실기기 확인). 부서활동·셀 소식 상세와 같은 하단 고정으로 통일한다.
          여백·테두리를 className이 아니라 style로 주는 이유도 부서활동 상세와 같다 —
          키보드 높이는 매번 달라져 className으로 못 만들고, 섞어 쓰면 style이 무시된다. */}
      <View
        style={{
          paddingHorizontal: CONTENT_PADDING,
          paddingTop: 8,
          paddingBottom: (keyboardHeight || insets.bottom) + 8,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.text.assistive,
          backgroundColor: colors.background.normal,
        }}
      >
        <CommentInput value={comment} onChangeText={setComment} onSubmit={handleCommentSubmit} />
      </View>

      <AppDialog
        ref={rejectDialogRef}
        title={`${pendingReject?.name ?? ""}님의 신청을 거절하시겠습니까?`}
        confirmLabel="거절"
        cancelLabel="취소"
        onConfirm={confirmReject}
      />
    </View>
  );
}
