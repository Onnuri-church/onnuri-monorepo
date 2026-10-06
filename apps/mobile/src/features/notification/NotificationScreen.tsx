import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { NotificationInfo } from "@onnuri/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";

import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { Header } from "../../shared/components/base/Header";
import { Icon } from "../../shared/components/base/Icon";
import { Logo } from "../../shared/components/base/Logo";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { toTimeAgo } from "../../shared/utils/date";
import {
  useMarkAllNotificationsRead,
  useNotifications,
  useRemoveAllNotifications,
  useRemoveNotification,
} from "./api";

// 카드 상단 라벨 옆 로고 심볼 크기 (시안 15).
const SYMBOL_SIZE = 15;
// 더보기 한 번에 추가로 펼치는 건수 (2026-10-07 결정 — 한 번에 다 펼치면 도배된다.
// 5개는 한 카드가 화면을 너무 차지해서 4개로 줄임).
const EXPAND_STEP = 4;
// 스와이프로 드러나는 삭제 버튼 폭 (팀 관리 행과 같은 결).
const ACTION_WIDTH = 72;

// 행 왼쪽 스와이프 → 삭제 버튼. 팀 관리(TeamListItem)와 같은 Swipeable 구성이다.
function SwipeableRow({ onDelete, children }: { onDelete: () => void; children: ReactNode }) {
  return (
    <ReanimatedSwipeable
      rightThreshold={ACTION_WIDTH / 2}
      overshootRight={false}
      renderRightActions={(_progress, _translation, methods) => (
        <Pressable
          className="items-center justify-center"
          style={{ width: ACTION_WIDTH }}
          onPress={() => {
            methods.close();
            onDelete();
          }}
        >
          <Icon name="trash-can" size={20} color={colors.semantic.danger} />
        </Pressable>
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

// 알림센터 (2026-09-30 시안). 같은 종류(type) 알림을 카드 하나로 묶는다 —
// 최신 1건을 크게 보여주고 나머지는 "N건 더보기"로 펼친다.
// 안읽음이 있는 카드는 연녹색 배경, 전부 읽었으면 흰 배경에 회색 본문.
export function NotificationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const { data: notifications, isLoading, refetch, isRefetching } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();
  const removeNotification = useRemoveNotification();
  const removeAll = useRemoveAllNotifications();

  // 카드(type)별로 최신 1건 외에 추가로 펼친 건수 — 더보기를 누를 때마다 EXPAND_STEP씩 는다.
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});

  // 헤더의 "모두 지우기" — 실수 방지로 확인 팝업을 거친다. 알림이 없으면 문구를 숨긴다.
  // 헤더 정의는 화면당 한 곳 규칙대로 등록부 대신 여기서 그린다 (PrayerMenu와 같은 방식).
  const clearDialogRef = useRef<AppDialogRef>(null);
  const hasItems = (notifications?.length ?? 0) > 0;
  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <Header
          variant="sub"
          title=""
          rightAction={hasItems ? "text" : "none"}
          rightLabel="모두 지우기"
          onPressRightLabel={() => clearDialogRef.current?.open()}
        />
      ),
    });
  }, [navigation, hasItems]);

  const handleClearAllConfirm = () => {
    clearDialogRef.current?.close();
    removeAll.mutate();
  };

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

  // 더보기 — 누를 때마다 EXPAND_STEP씩 더 펼치고, 다 펼친 상태에서 "접기"로 되돌린다.
  const handleExpandPress = (type: string, restCount: number) => {
    setVisibleCounts((prev) => {
      const current = prev[type] ?? 0;
      return { ...prev, [type]: current >= restCount ? 0 : current + EXPAND_STEP };
    });
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
        <ScrollView
          contentContainerClassName="gap-5 px-5 pb-10 pt-6"
          // 화면을 열어둔 채 새 알림이 오면 당겨서 받아온다.
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
          }
        >
          {groups.map((group) => {
            const [latest, ...rest] = group;
            const hasUnread = group.some((item) => !item.isRead);
            const visible = Math.min(visibleCounts[latest.type] ?? 0, rest.length);
            const remaining = rest.length - visible;
            return (
              <View
                key={latest.type}
                className={`border-b border-background-muted p-4 ${
                  hasUnread ? "bg-background-alternative" : "bg-background-normal"
                }`}
              >
                <SwipeableRow onDelete={() => removeNotification.mutate(latest.id)}>
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
                </SwipeableRow>

                {rest.slice(0, visible).map((item) => (
                  <SwipeableRow key={item.id} onDelete={() => removeNotification.mutate(item.id)}>
                    <Pressable
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
                  </SwipeableRow>
                ))}

                {rest.length > 0 && (
                  <Pressable
                    className="mt-3"
                    onPress={() => handleExpandPress(latest.type, rest.length)}
                    hitSlop={8}
                  >
                    <Text
                      className={`text-body-small-bold ${
                        hasUnread ? "text-primary-normal" : "text-text-alternative"
                      }`}
                    >
                      {remaining > 0 ? `더보기 +${remaining}` : "접기"}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      <AppDialog
        ref={clearDialogRef}
        title="알림을 모두 지울까요?"
        description="지운 알림은 되돌릴 수 없어요"
        confirmLabel="모두 지우기"
        cancelLabel="취소"
        onConfirm={handleClearAllConfirm}
      />
    </View>
  );
}
