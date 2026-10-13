import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { UnreadBadge } from "../../shared/components/base/UnreadBadge";
import { ManageLinkCard } from "../cell/components/ManageLinkCard";
import { useChatRooms, useTeamBoardUnread } from "./api";
import type { RootStackParamList } from "../../shared/types/navigation";

// 소속팀 공간 — 그 팀 팀원과 관리자만 들어온다. 안에 "게시판"(팀원끼리 글·사진·파일을 나누는 곳)과
// "단톡방"(팀장이 팀원 중 골라서 만드는 대화방)이 있다. 공개 부서활동 게시판과는 별개다.
export function TeamSpaceScreen() {
  const { t } = useTranslation();
  const { params } = useRoute<RouteProp<RootStackParamList, "TeamSpace">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // 단톡방 입구의 안 읽은 표시 — 그 팀의 모든 방의 안 읽은 메시지 합.
  const { data: rooms } = useChatRooms(params.teamId);
  const unreadTotal = (rooms ?? []).reduce((sum, room) => sum + room.unreadCount, 0);
  // 팀 게시판 입구의 새 글 수 — 글 목록에는 따로 표시하지 않고 입구에만 둔다.
  const { data: boardUnread } = useTeamBoardUnread(params.teamId, true);

  return (
    <View className="flex-1 gap-4 bg-background-normal px-5 pt-6">
      <ManageLinkCard
        title={t("팀 게시판")}
        description={t("팀원끼리 글·사진·파일을 나눠요")}
        onPress={() => navigation.navigate("TeamBoard", { teamId: params.teamId })}
        right={<UnreadBadge count={boardUnread ?? 0} />}
      />
      <ManageLinkCard
        title={t("팀 단톡방")}
        description={t("팀장이 만든 대화방에서 이야기를 나눠요")}
        onPress={() => navigation.navigate("ChatRoomList", { teamId: params.teamId })}
        right={<UnreadBadge count={unreadTotal} />}
      />
    </View>
  );
}
