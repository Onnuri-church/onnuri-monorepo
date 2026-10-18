import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";

import { Header } from "../../shared/components/base/Header";
import type { RootStackParamList } from "../../shared/types/navigation";
import { ChatRoomView } from "../chat/ChatRoomView";
import { useLeaderRoomDetail } from "./api";

// 전체 리더 방 대화 화면 — 본체는 팀·셀 단톡방과 같은 ChatRoomView다.
// 관리자에게는 헤더 오른쪽에 "관리"(이름 수정, 멤버 추가·내보내기, 방 삭제)가 붙는다.
export function LeaderRoomScreen() {
  const { t } = useTranslation();
  const { params } = useRoute<RouteProp<RootStackParamList, "LeaderRoom">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: room } = useLeaderRoomDetail(params.roomId);

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <Header
          variant="sub"
          title={room?.name ?? t("리더 방")}
          rightAction={room?.canManage ? "text" : "none"}
          rightLabel={t("관리")}
          onPressRightLabel={() =>
            room && navigation.navigate("LeaderRoomForm", { roomId: room.id })
          }
        />
      ),
    });
  }, [navigation, room, t]);

  return <ChatRoomView kind="leader" id={params.roomId} />;
}
