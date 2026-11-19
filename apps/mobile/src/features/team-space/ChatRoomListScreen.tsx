import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import { usePullToRefresh } from "../../shared/hooks/usePullToRefresh";
import type { RootStackParamList } from "../../shared/types/navigation";
import { usePrefetchChatRooms } from "../chat/api";
import { ChatRoomList } from "../chat/components/ChatRoomList";
import { useMe } from "../profile/useMe";
import { useChatRoomListActions, useChatRooms } from "./api";

// 팀 단톡방 목록 — 팀장·관리자는 그 팀의 모든 방을, 팀원은 자기가 들어간 방만 본다.
// 방을 밀어 나가기는 누구나, 만들기·삭제(헤더 ☰)는 팀장·관리자만 (SCRUM-256·257).
export function ChatRoomListScreen() {
  const { t } = useTranslation();
  const { params } = useRoute<RouteProp<RootStackParamList, "ChatRoomList">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const me = useMe();
  const { data: rooms, isLoading, refetch } = useChatRooms(params.teamId);
  const pullRefresh = usePullToRefresh(refetch);
  const { leave, remove } = useChatRoomListActions();
  // 최근 대화가 오간 방부터 미리 받아 둬서 누르면 바로 보이게 한다 (SCRUM-225)
  usePrefetchChatRooms(
    "room",
    [...(rooms ?? [])]
      .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
      .map((room) => room.id),
  );

  const canManage =
    me?.isAdmin === true ||
    (me?.teams ?? []).some((team) => team.id === params.teamId && team.role === "LEADER");

  return (
    <ChatRoomList
      title={t("팀 단톡방")}
      rooms={rooms ?? []}
      isLoading={isLoading}
      pullRefresh={pullRefresh}
      canManage={canManage}
      emptyText={
        canManage
          ? t("아직 단톡방이 없어요. 오른쪽 위 ☰에서 만들어보세요.")
          : t("들어가 있는 단톡방이 없어요. 팀장이 초대하면 여기에 나타나요.")
      }
      onOpen={(roomId) => navigation.navigate("ChatRoom", { roomId })}
      onCreate={() => navigation.navigate("ChatRoomForm", { teamId: params.teamId })}
      onLeave={(roomId) => leave.mutateAsync(roomId)}
      onDelete={(roomId) => remove.mutateAsync(roomId)}
    />
  );
}
