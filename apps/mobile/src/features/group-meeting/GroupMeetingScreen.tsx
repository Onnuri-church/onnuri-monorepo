import type { GroupMeeting, GroupMeetingStatus } from "@onnuri/shared";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { useLayoutEffect, useRef, useState } from "react";
import { Image, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";

import { fetchGroupMeetings, useDeleteGroupMeeting } from "./api";
import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { Card } from "../../shared/components/base/Card";
import { Chip } from "../../shared/components/base/Chip";
import { Header } from "../../shared/components/base/Header";
import { Icon } from "../../shared/components/base/Icon";
import { Skeleton } from "../../shared/components/base/Skeleton";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useMe } from "../profile/useMe";
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

// 참여자 프로필을 겹쳐서 최대 3장 보여준다. 사진이 없는 자리는 회색 원으로 남긴다 —
// 참여자가 있는데 자리가 비면 카드가 깨져 보이므로 개수(count)만큼은 항상 그린다.
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

export function GroupMeetingScreen() {
  const [filter, setFilter] = useState<Filter>("all");
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const cardWidth = getCardWidth(width);

  // 관리자는 헤더 "편집"으로 카드 위 연필/휴지통을 켠다 (2026-09-21 관리자 시안).
  const me = useMe();
  const isAdmin = me?.isAdmin === true;
  const [editing, setEditing] = useState(false);
  const deleteDialogRef = useRef<AppDialogRef>(null);
  const [deleteTarget, setDeleteTarget] = useState<GroupMeeting | null>(null);
  const deleteMeeting = useDeleteGroupMeeting();

  const {
    data: meetings,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["group-meetings"],
    queryFn: fetchGroupMeetings,
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () =>
        isAdmin ? (
          <Header
            variant="sub"
            title="취향소그룹 게시판"
            rightAction="text"
            rightLabel={editing ? "완료" : "편집"}
            onPressRightLabel={() => setEditing((prev) => !prev)}
          />
        ) : (
          <Header variant="sub" title="취향소그룹 게시판" rightAction="home" />
        ),
    });
  }, [navigation, isAdmin, editing]);

  const handleDeletePress = (meeting: GroupMeeting) => {
    setDeleteTarget(meeting);
    deleteDialogRef.current?.open();
  };

  const confirmDelete = () => {
    deleteDialogRef.current?.close();
    if (deleteTarget && !deleteMeeting.isPending) {
      deleteMeeting.mutate(deleteTarget.id);
    }
    setDeleteTarget(null);
  };

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
          <View key={meeting.id} style={{ width: cardWidth }}>
            <Card
              imageSource={meeting.thumbnailUrl ? { uri: meeting.thumbnailUrl } : undefined}
              badge={<Chip color={meeting.status} text={meeting.statusLabel} />}
              dimmed={meeting.status === "closed"}
              onPress={() => navigation.navigate("GroupMeetingDetail", { id: meeting.id })}
            >
              <Text className="text-body-main text-text-normal">{meeting.title}</Text>
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
            {/* 편집 모드: 카드 우상단 연필/휴지통 오버레이 (시안 카드 액션) */}
            {editing && (
              <View className="absolute right-2 top-2 flex-row gap-1">
                <Pressable
                  className="h-7 w-7 items-center justify-center rounded-full bg-background-normal"
                  onPress={() => navigation.navigate("GroupMeetingForm", { meetingId: meeting.id })}
                  hitSlop={4}
                >
                  <Icon name="edit" size={14} color={colors.icon.normal} />
                </Pressable>
                <Pressable
                  className="h-7 w-7 items-center justify-center rounded-full bg-background-normal"
                  onPress={() => handleDeletePress(meeting)}
                  hitSlop={4}
                >
                  <Icon name="trash-can" size={14} color={colors.semantic.danger} />
                </Pressable>
              </View>
            )}
          </View>
        ))}

        {/* 소그룹 생성 — 관리자에게만 보이는 점선 카드 (시안: 카드 목록 끝) */}
        {isAdmin && (
          <Pressable
            className="items-center justify-center gap-2 rounded-2xl border border-dashed border-background-assistive"
            style={{ width: cardWidth, minHeight: 214 }}
            onPress={() => navigation.navigate("GroupMeetingForm", {})}
          >
            <Icon name="plus" size={16} color={colors.icon.normal} />
            <Text className="text-body-regular text-text-alternative">소그룹 생성</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* 삭제 확정 문구 (2026-09-21 시안) — 소그룹은 hard delete라 참여 기록까지 지워진다 */}
      <AppDialog
        ref={deleteDialogRef}
        title={`'${deleteTarget?.title ?? ""}'를 삭제하시겠습니까?`}
        description={"게시글과 참여 기록이 모두 삭제되며\n복구할 수 없습니다."}
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={confirmDelete}
      />
    </View>
  );
}
