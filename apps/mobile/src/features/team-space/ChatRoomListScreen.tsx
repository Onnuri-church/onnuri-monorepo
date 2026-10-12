import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Header } from "../../shared/components/base/Header";
import type { RootStackParamList } from "../../shared/types/navigation";
import { toTimeAgo } from "../../shared/utils/date";
import { useMe } from "../profile/useMe";
import { useChatRooms } from "./api";

// 팀 단톡방 목록 — 팀장·관리자는 그 팀의 모든 방을, 팀원은 자기가 들어간 방만 본다.
// 새 방 만들기는 팀장·관리자만 (헤더 오른쪽 "만들기").
export function ChatRoomListScreen() {
  const { t } = useTranslation();
  const { params } = useRoute<RouteProp<RootStackParamList, "ChatRoomList">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const { data: rooms, isLoading, refetch, isRefetching } = useChatRooms(params.teamId);

  const canCreate =
    me?.isAdmin === true ||
    (me?.teams ?? []).some((team) => team.id === params.teamId && team.role === "LEADER");

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <Header
          variant="sub"
          title={t("팀 단톡방")}
          rightAction={canCreate ? "text" : "none"}
          rightLabel={t("만들기")}
          onPressRightLabel={() => navigation.navigate("ChatRoomForm", { teamId: params.teamId })}
        />
      ),
    });
  }, [navigation, canCreate, params.teamId, t]);

  return (
    <View className="flex-1 bg-background-normal">
      <FlatList
        data={rooms ?? []}
        keyExtractor={(room) => room.id}
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
        renderItem={({ item: room }) => (
          <Pressable
            className="mx-5 border-b border-background-assistive py-4 active:opacity-60"
            onPress={() => navigation.navigate("ChatRoom", { roomId: room.id })}
          >
            <View className="flex-row items-center justify-between">
              <Text className="flex-1 text-body-main text-text-normal" numberOfLines={1}>
                {room.name}
              </Text>
              <Text className="ml-2 text-caption-main text-text-alternative">
                {toTimeAgo(room.lastActivityAt)}
              </Text>
            </View>
            <Text className="mt-1 text-body-small text-text-alternative" numberOfLines={1}>
              {room.lastMessage ?? t("아직 대화가 없어요")} · {t("{{count}}명", { count: room.memberCount })}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          isLoading ? null : (
            <Text className="mt-16 px-5 text-center text-body-medium text-text-alternative">
              {canCreate
                ? t("아직 단톡방이 없어요. 오른쪽 위 \"만들기\"로 만들어보세요.")
                : t("들어가 있는 단톡방이 없어요. 팀장이 초대하면 여기에 나타나요.")}
            </Text>
          )
        }
      />
    </View>
  );
}
