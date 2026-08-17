import type { GroupMeeting, GroupMeetingStatus } from "@onnuri/shared";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, Text, View, useWindowDimensions } from "react-native";

import { fetchGroupMeetings } from "./api";
import { Card } from "../../shared/components/base/Card";
import { Chip } from "../../shared/components/base/Chip";
import { Skeleton } from "../../shared/components/base/Skeleton";
import type { RootStackParamList } from "../../shared/types/navigation";
import { FilterChip } from "./components/FilterChip";

type Filter = "all" | GroupMeetingStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "open", label: "모집중" },
  { value: "closed", label: "마감" },
];

// 카드 폭은 고정값이 아니라 이 규칙에서 계산한다. 시안 확정값은 402pt 프레임 기준으로
// 좌우 20 / 간격 16 / 카드 173 (20+173+16+173+20 = 402)이고, 폭을 173으로 박으면
// 360·375pt 기기에서 2열이 안 들어가 1열로 접힌다.
const LIST_PADDING = 20;
const CARD_GAP = 16;
const MIN_CARD_WIDTH = 173;

function getCardWidth(screenWidth: number): number {
  const available = screenWidth - LIST_PADDING * 2;
  // 최소 폭 기준으로 최대 몇 열이 들어가는지 (좁은 화면에서도 2열은 유지)
  const columns = Math.max(2, Math.floor((available + CARD_GAP) / (MIN_CARD_WIDTH + CARD_GAP)));
  return (available - CARD_GAP * (columns - 1)) / columns;
}

// "2026-07-31" → "~7/31"
function formatDeadline(deadline: string): string {
  const date = new Date(deadline);
  return `~${date.getMonth() + 1}/${date.getDate()}`;
}

// 참여자 아바타 자리 표시 (최대 3개) — 실제 프로필 이미지가 생기면 교체한다.
function ParticipantDots({ count }: { count: number }) {
  return (
    <View className="flex-row">
      {Array.from({ length: Math.min(count, 3) }).map((_, index) => (
        <View
          key={index}
          className={
            index === 0
              ? "h-6 w-6 rounded-full bg-text-assistive"
              : "-ml-2 h-6 w-6 rounded-full bg-text-assistive"
          }
        />
      ))}
    </View>
  );
}

export function GroupMeetingScreen() {
  const [filter, setFilter] = useState<Filter>("all");
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const cardWidth = getCardWidth(width);

  const {
    data: meetings,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["group-meetings"],
    queryFn: fetchGroupMeetings,
  });

  const filterRow = (
    <View className="flex-row gap-2 py-3" style={{ paddingHorizontal: LIST_PADDING }}>
      {FILTERS.map(({ value, label }) => (
        <FilterChip
          key={value}
          label={label}
          selected={filter === value}
          onPress={() => setFilter(value)}
        />
      ))}
    </View>
  );

  if (isPending) {
    return (
      <View>
        {filterRow}
        <View
          className="flex-row flex-wrap"
          style={{ gap: CARD_GAP, paddingHorizontal: LIST_PADDING }}
        >
          <Skeleton className="h-52 w-44 rounded-2xl" />
          <Skeleton className="h-52 w-44 rounded-2xl" />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-body-medium text-text-alternative">모임을 불러오지 못했어요</Text>
      </View>
    );
  }

  const visible = filter === "all" ? meetings : meetings.filter((m) => m.status === filter);

  return (
    <View className="flex-1 bg-background-normal">
      {filterRow}
      <ScrollView
        contentContainerClassName="flex-row flex-wrap pb-6"
        contentContainerStyle={{ gap: CARD_GAP, paddingHorizontal: LIST_PADDING }}
      >
        {visible.map((meeting) => (
          <Card
            key={meeting.id}
            style={{ width: cardWidth }}
            imageSource={meeting.thumbnailUrl ? { uri: meeting.thumbnailUrl } : undefined}
            badge={<Chip color={meeting.status} text={meeting.statusLabel} />}
            dimmed={meeting.status === "closed"}
            onPress={() => navigation.navigate("GroupMeetingDetail", { id: meeting.id })}
          >
            <Text className="text-label-small text-text-alternative">{meeting.category}</Text>
            <Text className="text-body-main text-text-normal">{meeting.title}</Text>
            <View className="mt-auto flex-row items-center justify-between pt-4">
              <Text className="text-label-small text-text-neutral">
                {formatDeadline(meeting.deadline)}
              </Text>
              <ParticipantDots count={meeting.participantCount} />
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}
