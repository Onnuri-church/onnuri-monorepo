import type { GroupMeetingDetail } from "@onnuri/shared";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Image, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";

import { apiClient } from "../../shared/api/client";
import { Button } from "../../shared/components/base/Button";
import { Chip } from "../../shared/components/base/Chip";
import { Icon } from "../../shared/components/base/Icon";
import { InfoBox } from "../../shared/components/base/InfoBox";
import { Skeleton } from "../../shared/components/base/Skeleton";
import { Thumbnail } from "../../shared/components/base/Thumbnail";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { CommentInput } from "./components/CommentInput";
import { CommentItem } from "./components/CommentItem";

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
  const [comment, setComment] = useState("");
  const { width } = useWindowDimensions();
  const thumb = getThumbLayout(width);

  const {
    data: meeting,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["group-meetings", params.id],
    queryFn: async () =>
      (await apiClient.get<GroupMeetingDetail>(`/group-meetings/${params.id}`)).data,
  });

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

        <View className="gap-2 pt-4" style={{ paddingHorizontal: CONTENT_PADDING }}>
          <View className="flex-row items-center gap-2">
            <Text className="text-label-medium text-primary-normal">{meeting.statusLabel}</Text>
            <Text className="text-label-medium text-text-alternative">{meeting.periodLabel}</Text>
          </View>
          <Text className="text-heading-main text-text-normal">{meeting.title}</Text>
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
          <View className="mt-3 flex-row items-center gap-3">
            <View className="flex-row">
              {meeting.participantAvatarUrls.map((url, index) => (
                <Image
                  key={url}
                  source={{ uri: url }}
                  className={index === 0 ? "h-8 w-8 rounded-full" : "-ml-2 h-8 w-8 rounded-full"}
                />
              ))}
            </View>
            <Text className="text-body-small text-text-neutral">
              총 {meeting.participantCount}명
            </Text>
          </View>
        </View>

        {leadPhoto && (
          <View className="pt-6" style={{ paddingHorizontal: CONTENT_PADDING }}>
            <Text className="text-heading-small text-text-normal">활동 사진</Text>
            <Thumbnail
              className="mt-3"
              source={{ uri: leadPhoto.url }}
              ratio={LEAD_PHOTO_RATIO}
              caption={leadPhoto.caption ?? undefined}
              style={{ maxHeight: LEAD_PHOTO_MAX_HEIGHT }}
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
                />
              ))}
            </View>
            <Pressable className="mt-3 flex-row items-center justify-center gap-1">
              <Text className="text-label-small text-text-alternative">
                사진 {meeting.photoCount}장 모두 보기
              </Text>
              {/* 오른쪽 화살표 아이콘이 세트에 없어 back(왼쪽)을 뒤집어 쓴다 —
                  손으로 새 SVG를 그리면 획 굵기·그리드가 세트와 어긋난다. */}
              <View style={{ transform: [{ rotate: "180deg" }] }}>
                <Icon name="back" size={16} color={colors.icon.normal} />
              </View>
            </Pressable>
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
                timeAgo={item.timeAgo}
                content={item.content}
                avatarUrl={item.authorAvatarUrl}
              />
            ))}
          </View>
          <View className="mt-3">
            <CommentInput
              value={comment}
              onChangeText={setComment}
              onSubmit={() => setComment("")}
            />
          </View>
        </View>

        <View className="pt-6" style={{ paddingHorizontal: CONTENT_PADDING }}>
          <Button label="등록하기" />
        </View>
      </ScrollView>
    </View>
  );
}
