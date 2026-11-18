import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Header } from "../../shared/components/base/Header";
import { UnreadBadge } from "../../shared/components/base/UnreadBadge";
import type { RootStackParamList } from "../../shared/types/navigation";
import { toTimeAgo } from "../../shared/utils/date";
import { useMe } from "../profile/useMe";
import { useLeaderRooms } from "./api";
import { usePullToRefresh } from "../../shared/hooks/usePullToRefresh";
import { usePrefetchChatRooms } from "../chat/api";

// 전체 리더 방 목록 — 팀장·팔로워(셀장·부셀장)는 자기가 들어간 방만, 관리자는 모든 방을 본다.
// 새 방 만들기는 관리자만 (헤더 오른쪽 "만들기").
export function LeaderRoomListScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const { data: rooms, isLoading, refetch } = useLeaderRooms(true);
  const pullRefresh = usePullToRefresh(refetch);
  // 최근 대화가 오간 방부터 미리 받아 둬서 누르면 바로 보이게 한다 (SCRUM-225)
  usePrefetchChatRooms(
    "leader",
    [...(rooms ?? [])]
      .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
      .map((room) => room.id),
  );

  const canCreate = me?.isAdmin === true;

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <Header
          variant="sub"
          title={t("전체 리더 방")}
          rightAction={canCreate ? "text" : "none"}
          rightLabel={t("만들기")}
          onPressRightLabel={() => navigation.navigate("LeaderRoomForm", {})}
        />
      ),
    });
  }, [navigation, canCreate, t]);

  return (
    <View className="flex-1 bg-background-normal">
      <FlatList
        data={rooms ?? []}
        keyExtractor={(room) => room.id}
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        refreshControl={<RefreshControl {...pullRefresh} />}
        renderItem={({ item: room }) => (
          <Pressable
            className="mx-5 border-b border-background-assistive py-4 active:opacity-60"
            onPress={() => navigation.navigate("LeaderRoom", { roomId: room.id })}
          >
            <View className="flex-row items-center justify-between">
              <Text className="flex-1 text-body-main text-text-normal" numberOfLines={1}>
                {room.name}
              </Text>
              <UnreadBadge count={room.unreadCount} className="ml-2" />
              <Text className="ml-2 text-caption-main text-text-alternative">
                {toTimeAgo(room.lastActivityAt)}
              </Text>
            </View>
            <Text className="mt-1 text-body-small text-text-alternative" numberOfLines={1}>
              {room.lastMessage ?? t("아직 대화가 없어요")} ·{" "}
              {t("{{count}}명", { count: room.memberCount })}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          isLoading ? null : (
            <Text className="mt-16 px-5 text-center text-body-medium text-text-alternative">
              {canCreate
                ? t('아직 리더 방이 없어요. 오른쪽 위 "만들기"로 만들어보세요.')
                : t("들어가 있는 리더 방이 없어요. 관리자가 초대하면 여기에 나타나요.")}
            </Text>
          )
        }
      />
    </View>
  );
}
