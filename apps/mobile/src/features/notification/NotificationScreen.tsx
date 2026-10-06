import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { NotificationInfo } from "@onnuri/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Logo } from "../../shared/components/base/Logo";
import type { RootStackParamList } from "../../shared/types/navigation";
import { toTimeAgo } from "../../shared/utils/date";
import { useMarkAllNotificationsRead, useNotifications } from "./api";

// 카드 상단 라벨 옆 로고 심볼 크기 (시안 15).
const SYMBOL_SIZE = 15;

// 알림센터 (2026-09-30 시안). 같은 종류(type) 알림을 카드 하나로 묶는다 —
// 최신 1건을 크게 보여주고 나머지는 "N건 더보기"로 펼친다.
// 안읽음이 있는 카드는 연녹색 배경, 전부 읽었으면 흰 배경에 회색 본문.
export function NotificationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const { data: notifications, isLoading } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();

  // 펼쳐진 카드의 type 목록.
  const [expandedTypes, setExpandedTypes] = useState<string[]>([]);

  // 화면을 열면 전체 읽음 처리 — 캐시는 안 건드려서 보는 동안은 안읽음 강조가 유지되고,
  // 나갈 때 무효화해 다음 방문에 읽음 상태로 온다.
  const hasMarkedRead = useRef(false);
  useEffect(() => {
    if (!notifications || hasMarkedRead.current) return;
    hasMarkedRead.current = true;
    if (notifications.some((item) => !item.isRead)) markAllRead.mutate();
  }, [notifications, markAllRead]);
  useEffect(
    () => () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    [queryClient],
  );

  // 종류별 묶음 — 목록이 최신순이라 Map의 삽입 순서가 곧 "가장 최신 알림을 가진 묶음" 순서다.
  const groups = useMemo(() => {
    const map = new Map<string, NotificationInfo[]>();
    for (const item of notifications ?? []) {
      const group = map.get(item.type);
      if (group) group.push(item);
      else map.set(item.type, [item]);
    }
    return [...map.values()];
  }, [notifications]);

  const handleItemPress = (item: NotificationInfo) => {
    if (!item.linkUrl) return;
    const [kind, first, second] = item.linkUrl.split("/");
    if (!first) return;
    switch (kind) {
      case "notice":
        navigation.navigate("NoticeDetail", { id: first });
        break;
      case "follower-note":
        if (second) navigation.navigate("FollowerNoteDetail", { cellId: first, noteId: second });
        break;
      case "group-meeting":
        navigation.navigate("GroupMeetingDetail", { id: first });
        break;
      case "department-activity":
        navigation.navigate("DepartmentActivityDetail", { id: first });
        break;
      case "qt":
        navigation.navigate("QtBoardDetail", { id: first });
        break;
      case "sermon":
        navigation.navigate("SermonDetail", { id: first });
        break;
      case "prayer":
        navigation.navigate("PrayerBoardDetail", { id: first });
        break;
      case "cell-news":
        if (second) navigation.navigate("CellNewsDetail", { cellId: first, newsId: second });
        break;
    }
  };

  const toggleExpanded = (type: string) => {
    setExpandedTypes((prev) =>
      prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type],
    );
  };

  return (
    <View className="flex-1 bg-background-normal">
      <Text className="mt-3 px-5 text-title text-text-normal">알림</Text>

      {!isLoading && groups.length === 0 ? (
        /* 빈 상태 — 짧은 회색 선 + 두 줄 안내 (시안) */
        <View className="flex-1 items-center justify-center gap-5 pb-20">
          <View className="h-1 w-9 bg-background-assistive" />
          <View className="items-center gap-2">
            <Text className="text-heading-medium text-text-normal">아직 알림이 없어요</Text>
            <Text className="text-heading-small text-text-alternative">
              새로운 소식이 오면 여기에 표시돼요
            </Text>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-5 px-5 pb-10 pt-6">
          {groups.map((group) => {
            const [latest, ...rest] = group;
            const hasUnread = group.some((item) => !item.isRead);
            const isExpanded = expandedTypes.includes(latest.type);
            return (
              <View
                key={latest.type}
                className={`border-b border-background-muted p-4 ${
                  hasUnread ? "bg-background-alternative" : "bg-background-normal"
                }`}
              >
                <Pressable className="gap-3" onPress={() => handleItemPress(latest)}>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-1.5">
                      <Logo variant="symbol" width={SYMBOL_SIZE} />
                      <Text className="text-caption-main text-text-alternative">
                        {latest.title}
                      </Text>
                    </View>
                    <Text className="text-label-small text-text-alternative">
                      {toTimeAgo(latest.createdAt)}
                    </Text>
                  </View>
                  <Text
                    className={`text-body-medium ${
                      latest.isRead ? "text-text-alternative" : "text-text-normal"
                    }`}
                    numberOfLines={1}
                  >
                    {latest.body}
                  </Text>
                </Pressable>

                {isExpanded &&
                  rest.map((item) => (
                    <Pressable
                      key={item.id}
                      className="mt-3 flex-row items-center gap-3 border-b border-background-muted pb-2.5"
                      onPress={() => handleItemPress(item)}
                    >
                      <Text
                        className="flex-1 text-body-small text-text-alternative"
                        numberOfLines={1}
                      >
                        {item.body}
                      </Text>
                      <Text className="text-label-small text-text-alternative">
                        {toTimeAgo(item.createdAt)}
                      </Text>
                    </Pressable>
                  ))}

                {rest.length > 0 && (
                  <Pressable className="mt-3" onPress={() => toggleExpanded(latest.type)} hitSlop={8}>
                    <Text
                      className={`text-body-small-bold ${
                        hasUnread ? "text-primary-normal" : "text-text-alternative"
                      }`}
                    >
                      {isExpanded ? "접기" : `${rest.length}건 더보기`}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
