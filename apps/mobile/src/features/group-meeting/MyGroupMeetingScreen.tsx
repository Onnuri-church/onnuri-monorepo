import type { MyGroupMeeting } from "@onnuri/shared";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Image, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";

import { fetchMyGroupMeetings } from "./api";
import { CardImageFallback } from "./components/CardImageFallback";
import { Button } from "../../shared/components/base/Button";
import { Card } from "../../shared/components/base/Card";
import { Chip } from "../../shared/components/base/Chip";
import { Skeleton } from "../../shared/components/base/Skeleton";
import type { RootStackParamList } from "../../shared/types/navigation";

// 카드 폭·마감일 표기·참여자 아바타는 게시판(GroupMeetingScreen)과 같은 규칙이다.
// 그쪽 지역 헬퍼를 끌어오면 화면 파일을 화면이 import하는 모양이 돼서 작게 복제했다 —
// 카드 규칙이 바뀌면 두 화면을 같이 고친다.
const LIST_PADDING = 20;
const CARD_GAP = 16;
const MIN_CARD_WIDTH = 173;

function getCardWidth(screenWidth: number): number {
  const available = screenWidth - LIST_PADDING * 2;
  const columns = Math.max(2, Math.floor((available + CARD_GAP) / (MIN_CARD_WIDTH + CARD_GAP)));
  return (available - CARD_GAP * (columns - 1)) / columns;
}

// "2026-07-31" → "~7/31"
function formatDeadline(deadline: string): string {
  const date = new Date(deadline);
  return `~${date.getMonth() + 1}/${date.getDate()}`;
}

function ParticipantAvatars({ count, avatarUrls }: { count: number; avatarUrls: string[] }) {
  const slots = Array.from({ length: Math.min(count, 3) }, (_, index) => avatarUrls[index]);

  return (
    <View className="flex-row">
      {slots.map((url, index) =>
        url ? (
          <Image
            key={url}
            source={{ uri: url }}
            className={index === 0 ? "h-6 w-6 rounded-full" : "-ml-2 h-6 w-6 rounded-full"}
          />
        ) : (
          <View
            key={index}
            className={
              index === 0
                ? "h-6 w-6 rounded-full bg-text-assistive"
                : "-ml-2 h-6 w-6 rounded-full bg-text-assistive"
            }
          />
        ),
      )}
    </View>
  );
}

// 마이페이지 "취향 소그룹" — 내가 신청(대기중)·참여 중인 모임만 모아 보여준다.
// 카드를 누르면 게시판과 같은 상세로 간다 (소그룹장은 거기서 수정·승인 등 관리).
export function MyGroupMeetingScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const cardWidth = getCardWidth(width);

  const {
    data: meetings,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["group-meetings", "mine"],
    queryFn: fetchMyGroupMeetings,
  });

  if (isPending) {
    return (
      <View
        className="flex-row flex-wrap bg-background-normal pt-4"
        style={{ gap: CARD_GAP, paddingHorizontal: LIST_PADDING }}
      >
        <Skeleton className="h-52 w-44 rounded-2xl" />
        <Skeleton className="h-52 w-44 rounded-2xl" />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-background-normal">
        <Text className="text-body-medium text-text-alternative">{t("모임을 불러오지 못했어요")}</Text>
      </View>
    );
  }

  if (meetings.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-6 bg-background-normal px-10">
        <Text className="text-body-medium text-text-alternative">
          {t("아직 참여 중인 소그룹이 없어요")}
        </Text>
        {/* 버튼 폭은 호출부가 정한다(Button 주석) — 가운데 정렬 컨테이너라 늘려서 준다. */}
        <View className="self-stretch">
          <Button label={t("소그룹 둘러보기")} onPress={() => navigation.navigate("GroupMeeting")} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      className="bg-background-normal"
      contentContainerClassName="flex-row flex-wrap pb-6 pt-4"
      contentContainerStyle={{ gap: CARD_GAP, paddingHorizontal: LIST_PADDING }}
    >
      {meetings.map((meeting: MyGroupMeeting) => (
        <View key={meeting.id} style={{ width: cardWidth }}>
          <Card
            imageSource={meeting.thumbnailUrl ? { uri: meeting.thumbnailUrl } : undefined}
            imageFallback={<CardImageFallback />}
            badge={<Chip color={meeting.status} text={t(meeting.statusLabel)} />}
            dimmed={meeting.status === "closed"}
            onPress={() => navigation.navigate("GroupMeetingDetail", { id: meeting.id })}
          >
            <Text className="text-body-main text-text-normal">{meeting.title}</Text>
            {/* 내 상태 — 소그룹장이면서 대기중일 수는 없어서(소그룹장은 자동 승인) 한 줄이면 된다 */}
            {meeting.isLeader && (
              <Text className="mt-1 text-label-small text-primary-normal">{t("소그룹장")}</Text>
            )}
            {meeting.myStatus === "PENDING" && (
              <Text className="mt-1 text-label-small text-text-neutral">{t("승인 대기중")}</Text>
            )}
            <View className="mt-auto flex-row items-center justify-between pt-4">
              <Text className="text-label-small text-text-neutral">
                {meeting.deadline ? formatDeadline(meeting.deadline) : ""}
              </Text>
              <ParticipantAvatars
                count={meeting.participantCount}
                avatarUrls={meeting.participantAvatarUrls}
              />
            </View>
          </Card>
        </View>
      ))}
    </ScrollView>
  );
}
