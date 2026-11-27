import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { ChatRoomSummary } from "@onnuri/shared";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, SectionList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiClient } from "../../shared/api/client";
import { Header } from "../../shared/components/base/Header";
import { PressableScale } from "../../shared/components/base/PressableScale";
import { ThemedRefreshControl } from "../../shared/components/base/ThemedRefreshControl";
import { UnreadBadge } from "../../shared/components/base/UnreadBadge";
import { usePullToRefresh } from "../../shared/hooks/usePullToRefresh";
import type { RootStackParamList } from "../../shared/types/navigation";
import { toTimeAgo } from "../../shared/utils/date";
import { fetchMyGroupMeetings } from "../group-meeting/api";
import { usePrefetchChatRooms } from "./api";
import type { LeaderRoomSummary } from "@onnuri/shared";
import { useLeaderRooms } from "../leader-room/api";
import { useMe } from "../profile/useMe";

// 목록 한 줄 — 방 종류마다 서버가 주는 정보가 달라서, 없는 값은 비워 둔다
// (셀·소그룹 채팅은 마지막 메시지를 따로 내려주지 않는다).
interface ChatRow {
  key: string;
  name: string;
  unreadCount: number;
  /** 둘째 줄 — 마지막 메시지나 방 설명 */
  subtitle: string;
  /** 마지막 대화 시각 (없으면 표시하지 않는다) */
  lastActivityAt?: string;
  onOpen: () => void;
}

const UNREAD_INTERVAL = 15000;

type ChatCategory = "team" | "cell" | "group" | "leader";

const fetchUnread = (path: string) =>
  apiClient.get<{ count: number }>(path).then((res) => res.data.count);

const fetchTeamRooms = (teamId: string) =>
  apiClient.get<ChatRoomSummary[]>(`/teams/${teamId}/chat-rooms`).then((res) => res.data);

// 홈 화면이 뜰 때 채팅 목록에 필요한 것을 한 번 미리 받아 둔다 — 채팅 아이콘을 누르면 캐시로 바로
// 그려서, 구역이 하나씩 나타나거나 칩 줄이 뒤늦게 생기며 화면이 바뀌는 일이 없다.
// 쿼리 키는 아래 화면과 같다. 계속 다시 받지는 않는다 (홈에서는 한 번만).
export function usePrefetchMyChats() {
  const queryClient = useQueryClient();
  const me = useMe();
  const teamIds = (me?.teams ?? []).map((team) => team.id).join(",");
  const cellId = me?.cell?.id ?? "";
  const canUseLeaderRooms = me?.canUseLeaderRooms === true;
  const signedIn = me !== undefined && me !== null;

  useEffect(() => {
    if (!signedIn) return;
    for (const teamId of teamIds ? teamIds.split(",") : []) {
      void queryClient.prefetchQuery({
        queryKey: ["chat-rooms", teamId],
        queryFn: () => fetchTeamRooms(teamId),
      });
    }
    if (cellId) {
      void queryClient.prefetchQuery({
        queryKey: ["chat-unread", "cell", cellId],
        queryFn: () => fetchUnread(`/cells/${cellId}/unread`),
      });
    }
    if (canUseLeaderRooms) {
      void queryClient.prefetchQuery({
        queryKey: ["leader-rooms"],
        queryFn: () =>
          apiClient.get<LeaderRoomSummary[]>("/leader-rooms").then((res) => res.data),
      });
    }
    void queryClient
      .fetchQuery({ queryKey: ["group-meetings", "mine"], queryFn: fetchMyGroupMeetings })
      .then((meetings) => {
        for (const meeting of meetings.filter((item) => item.myStatus === "APPROVED")) {
          void queryClient.prefetchQuery({
            queryKey: ["chat-unread", "group", meeting.id],
            queryFn: () => fetchUnread(`/group-meetings/${meeting.id}/unread`),
          });
        }
      })
      .catch(() => undefined);
  }, [queryClient, signedIn, teamIds, cellId, canUseLeaderRooms]);
}

// 내 단톡방 모아보기 (SCRUM-311) — 홈 헤더의 채팅 아이콘으로 들어온다.
// 팀 단톡방·셀 채팅·취향 소그룹 채팅·전체 리더 방이 화면마다 흩어져 있어서, 내가 들어가 있는 방을
// 종류별 구역으로 한 화면에 모았다. 소속이 없는 종류는 구역째로 보이지 않는다.
// 위쪽 칩(전체·팀·셀·취향 소그룹·리더)으로 한 종류만 골라 볼 수 있다 — 처음에는 전체.
// 방 목록은 종류별 기존 API를 그대로 쓴다 (쿼리 키도 같아서 각 화면과 캐시를 같이 쓴다).
export function MyChatsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const me = useMe();
  // 위쪽 칩으로 고른 종류 — null이면 전체
  const [category, setCategory] = useState<ChatCategory | null>(null);

  const teams = me?.teams ?? [];
  const cell = me?.cell ?? null;

  const teamRoomQueries = useQueries({
    queries: teams.map((team) => ({
      queryKey: ["chat-rooms", team.id],
      queryFn: () => fetchTeamRooms(team.id),
      refetchInterval: UNREAD_INTERVAL,
    })),
  });

  const cellUnread = useQuery({
    queryKey: ["chat-unread", "cell", cell?.id ?? ""],
    queryFn: () => fetchUnread(`/cells/${cell?.id}/unread`),
    enabled: cell !== null,
    refetchInterval: UNREAD_INTERVAL,
  });

  const myGroups = useQuery({
    queryKey: ["group-meetings", "mine"],
    queryFn: fetchMyGroupMeetings,
    enabled: me !== undefined && me !== null,
  });
  // 승인된 소그룹만 채팅에 들어갈 수 있다 (신청 대기 중인 모임은 뺀다).
  const groups = (myGroups.data ?? []).filter((meeting) => meeting.myStatus === "APPROVED");
  const groupUnreadQueries = useQueries({
    queries: groups.map((meeting) => ({
      queryKey: ["chat-unread", "group", meeting.id],
      queryFn: () => fetchUnread(`/group-meetings/${meeting.id}/unread`),
      refetchInterval: UNREAD_INTERVAL,
    })),
  });

  const leaderRooms = useLeaderRooms(me?.canUseLeaderRooms === true);

  // 목록이 보이는 동안 방의 대화를 미리 받아 둔다 — 방을 누르면 대화가 바로 보인다 (SCRUM-225와 같은 방식).
  // 종류마다 최근에 대화가 오간 방 몇 개까지만 받는다. 읽음 처리는 하지 않는다.
  usePrefetchChatRooms(
    "room",
    teamRoomQueries
      .flatMap((query) => query.data ?? [])
      .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
      .map((room) => room.id),
  );
  usePrefetchChatRooms("cell", cell ? [cell.id] : []);
  usePrefetchChatRooms(
    "group",
    groups.map((meeting) => meeting.id),
  );
  usePrefetchChatRooms(
    "leader",
    [...(leaderRooms.data ?? [])]
      .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
      .map((room) => room.id),
  );

  const refetchAll = () =>
    Promise.all([
      ...teamRoomQueries.map((query) => query.refetch()),
      cell ? cellUnread.refetch() : Promise.resolve(),
      myGroups.refetch(),
      ...groupUnreadQueries.map((query) => query.refetch()),
      me?.canUseLeaderRooms ? leaderRooms.refetch() : Promise.resolve(),
    ]);
  const pullRefresh = usePullToRefresh(refetchAll);

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => <Header variant="sub" title={t("채팅")} rightAction="none" />,
    });
  }, [navigation, t]);

  // 최근에 대화가 오간 방이 위로 온다.
  const byRecent = (a: { lastActivityAt: string }, b: { lastActivityAt: string }) =>
    b.lastActivityAt.localeCompare(a.lastActivityAt);

  const teamRows: ChatRow[] = teams.flatMap((team, index) =>
    [...(teamRoomQueries[index]?.data ?? [])].sort(byRecent).map((room) => ({
      key: `room:${room.id}`,
      // 팀이 여러 개면 어느 팀 방인지 알 수 있게 팀 이름을 앞에 붙인다.
      name: teams.length > 1 ? `${team.name} · ${room.name}` : room.name,
      unreadCount: room.unreadCount,
      subtitle: `${room.lastMessage ?? t("아직 대화가 없어요")} · ${t("{{count}}명", { count: room.memberCount })}`,
      lastActivityAt: room.lastActivityAt,
      onOpen: () => navigation.navigate("ChatRoom", { roomId: room.id, name: room.name }),
    })),
  );

  const cellRows: ChatRow[] = cell
    ? [
        {
          key: `cell:${cell.id}`,
          name: cell.name,
          unreadCount: cellUnread.data ?? 0,
          subtitle: t("우리 셀 단톡방"),
          onOpen: () => navigation.navigate("CellChat", { cellId: cell.id, name: cell.name }),
        },
      ]
    : [];

  const groupRows: ChatRow[] = groups.map((meeting, index) => ({
    key: `group:${meeting.id}`,
    name: meeting.title,
    unreadCount: groupUnreadQueries[index]?.data ?? 0,
    subtitle: t("{{count}}명", { count: meeting.participantCount }),
    onOpen: () => navigation.navigate("GroupChat", { meetingId: meeting.id, name: meeting.title }),
  }));

  const leaderRows: ChatRow[] = [...(leaderRooms.data ?? [])].sort(byRecent).map((room) => ({
    key: `leader:${room.id}`,
    name: room.name,
    unreadCount: room.unreadCount,
    subtitle: `${room.lastMessage ?? t("아직 대화가 없어요")} · ${t("{{count}}명", { count: room.memberCount })}`,
    lastActivityAt: room.lastActivityAt,
    onOpen: () => navigation.navigate("LeaderRoom", { roomId: room.id, name: room.name }),
  }));

  const allSections: { key: ChatCategory; title: string; data: ChatRow[] }[] = [
    { key: "team" as const, title: t("팀"), data: teamRows },
    { key: "cell" as const, title: t("셀"), data: cellRows },
    { key: "group" as const, title: t("취향 소그룹"), data: groupRows },
    { key: "leader" as const, title: t("리더"), data: leaderRows },
  ].filter((section) => section.data.length > 0);
  // 고른 종류의 방이 사라졌으면(방에서 나감 등) 전체로 돌아간다.
  const selected = allSections.some((section) => section.key === category) ? category : null;
  const sections = selected
    ? allSections.filter((section) => section.key === selected)
    : allSections;
  const chips: { key: ChatCategory | null; label: string; unread: number }[] = [
    { key: null, label: t("전체"), unread: 0 },
    ...allSections.map((section) => ({
      key: section.key,
      label: section.title,
      unread: section.data.reduce((sum, row) => sum + row.unreadCount, 0),
    })),
  ];

  // 전부 받은 뒤에 한 번에 그린다 — 받은 것부터 그리면 구역과 칩 줄이 하나씩 생기며 화면이 출렁인다.
  // 홈에서 미리 받아 두므로(usePrefetchMyChats) 보통은 들어오자마자 다 있다.
  const isLoading =
    me === undefined ||
    teamRoomQueries.some((query) => query.isLoading) ||
    cellUnread.isLoading ||
    myGroups.isLoading ||
    groupUnreadQueries.some((query) => query.isLoading) ||
    leaderRooms.isLoading;

  if (isLoading) return <View className="flex-1 bg-background-normal" />;

  return (
    <View className="flex-1 bg-background-normal">
      {/* 종류 칩 — 종류가 둘 이상일 때만 보인다. 좌우로 밀면 끝에서 살짝 늘어났다 돌아온다. */}
      {allSections.length > 1 && (
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            alwaysBounceHorizontal
            overScrollMode="always"
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12, gap: 12 }}
          >
            {chips.map((chip) => {
              const active = chip.key === selected;
              return (
                <PressableScale
                  key={chip.key ?? "all"}
                  scaleTo={0.92}
                  onPress={() => setCategory(chip.key)}
                  hitSlop={4}
                >
                  <View
                    className={
                      active
                        ? "flex-row items-center rounded-full bg-primary-normal px-6 py-3"
                        : "flex-row items-center rounded-full bg-background-alternative px-6 py-3"
                    }
                  >
                    <Text
                      className={
                        active
                          ? "text-heading-small text-text-onImage"
                          : "text-heading-small text-text-alternative"
                      }
                    >
                      {chip.label}
                    </Text>
                    <UnreadBadge count={chip.unread} className="ml-2" />
                  </View>
                </PressableScale>
              );
            })}
          </ScrollView>
        </View>
      )}
      <SectionList
        sections={sections}
        keyExtractor={(row) => row.key}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        refreshControl={<ThemedRefreshControl {...pullRefresh} />}
        renderSectionHeader={({ section }) =>
          // 한 종류만 골랐을 때는 칩이 제목 역할을 하므로 구역 제목을 뺀다.
          selected ? null : (
          <Text className="bg-background-normal px-5 pb-1 pt-5 text-caption-main text-text-alternative">
            {section.title}
          </Text>
          )
        }
        renderItem={({ item: row }) => (
          <Pressable
            className="flex-row items-center bg-background-normal px-5 active:opacity-60"
            onPress={row.onOpen}
          >
            <View className="flex-1 border-b border-background-assistive py-4">
              <View className="flex-row items-center justify-between">
                <Text className="flex-1 text-body-main text-text-normal" numberOfLines={1}>
                  {row.name}
                </Text>
                <UnreadBadge count={row.unreadCount} className="ml-2" />
                {row.lastActivityAt && (
                  <Text className="ml-2 text-caption-main text-text-alternative">
                    {toTimeAgo(row.lastActivityAt)}
                  </Text>
                )}
              </View>
              <Text className="mt-1 text-body-small text-text-alternative" numberOfLines={1}>
                {row.subtitle}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          isLoading ? null : (
            <Text className="mt-16 px-5 text-center text-body-medium text-text-alternative">
              {t("아직 참여 중인 단톡방이 없어요.\n팀·셀·소그룹에 들어가면 여기에 나타나요.")}
            </Text>
          )
        }
      />
    </View>
  );
}
