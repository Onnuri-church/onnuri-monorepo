import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";

import { Header } from "../../shared/components/base/Header";
import type { RootStackParamList } from "../../shared/types/navigation";
import { ChatRoomView } from "../chat/ChatRoomView";
import { useChatRoomDetail } from "./api";

// 팀 단톡방 대화 화면 — 본체는 셀 단톡방과 같은 ChatRoomView다.
// 팀장·관리자에게는 헤더 오른쪽에 "관리"(이름 수정, 멤버 추가·내보내기, 방 삭제)가 붙는다.
export function ChatRoomScreen() {
  const { t } = useTranslation();
  const { params } = useRoute<RouteProp<RootStackParamList, "ChatRoom">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: room } = useChatRoomDetail(params.roomId);

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <Header
          variant="sub"
          title={room?.name ?? t("단톡방")}
          rightAction={room?.canManage ? "text" : "none"}
          rightLabel={t("관리")}
          onPressRightLabel={() =>
            room && navigation.navigate("ChatRoomForm", { teamId: room.teamId, roomId: room.id })
          }
        />
      ),
    });
  }, [navigation, room, t]);

  return <ChatRoomView kind="room" id={params.roomId} />;
}
