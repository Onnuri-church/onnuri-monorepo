import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import { usePullToRefresh } from "../../shared/hooks/usePullToRefresh";
import type { RootStackParamList } from "../../shared/types/navigation";
import { usePrefetchChatRooms } from "../chat/api";
import { ChatRoomList } from "../chat/components/ChatRoomList";
import { useMe } from "../profile/useMe";
import { useLeaderRoomListActions, useLeaderRooms } from "./api";

// 전체 리더 방 목록 — 팀장·팔로워(셀장·부셀장)는 자기가 들어간 방만, 관리자는 모든 방을 본다.
// 방을 밀어 나가기는 누구나, 만들기·삭제(헤더 ☰)는 관리자만 (SCRUM-256·257).
export function LeaderRoomListScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const me = useMe();
  const { data: rooms, isLoading, refetch } = useLeaderRooms(true);
  const pullRefresh = usePullToRefresh(refetch);
  const { leave, remove } = useLeaderRoomListActions();
  // 최근 대화가 오간 방부터 미리 받아 둬서 누르면 바로 보이게 한다 (SCRUM-225)
  usePrefetchChatRooms(
    "leader",
    [...(rooms ?? [])]
      .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
      .map((room) => room.id),
  );

  const canManage = me?.isAdmin === true;

  return (
    <ChatRoomList
      title={t("전체 리더 방")}
      rooms={rooms ?? []}
      isLoading={isLoading}
      pullRefresh={pullRefresh}
      canManage={canManage}
      emptyText={
        canManage
          ? t("아직 리더 방이 없어요. 오른쪽 위 ☰에서 만들어보세요.")
          : t("들어가 있는 리더 방이 없어요. 관리자가 초대하면 여기에 나타나요.")
      }
      onOpen={(roomId) =>
        navigation.navigate("LeaderRoom", {
          roomId,
          name: rooms?.find((room) => room.id === roomId)?.name,
        })
      }
      onCreate={() => navigation.navigate("LeaderRoomForm", {})}
      onLeave={(roomId) => leave.mutateAsync(roomId)}
      onDelete={(roomId) => remove.mutateAsync(roomId)}
    />
  );
}
