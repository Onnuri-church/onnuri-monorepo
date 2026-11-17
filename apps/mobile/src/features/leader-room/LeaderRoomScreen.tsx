import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";

import { Header } from "../../shared/components/base/Header";
import type { RootStackParamList } from "../../shared/types/navigation";
import { ChatRoomView } from "../chat/ChatRoomView";
import { useLeaderRoomDetail, useLeaveLeaderRoom } from "./api";

// 전체 리더 방 대화 화면 — 본체는 팀·셀 단톡방과 같은 ChatRoomView다.
// 관리자에게는 헤더 오른쪽에 "관리"(이름 수정, 멤버 추가·내보내기, 방 삭제)가 붙는다.
export function LeaderRoomScreen() {
  const { t } = useTranslation();
  const { params } = useRoute<RouteProp<RootStackParamList, "LeaderRoom">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: room } = useLeaderRoomDetail(params.roomId);
  const leave = useLeaveLeaderRoom(params.roomId);

  // 멤버는 헤더 오른쪽 "나가기"로 방을 나간다 (SCRUM-223). 관리할 수 있는 사람은 "관리"가 대신 붙고,
  // 관리 화면에서 자기 자신을 내보내면 같은 "나갔어요" 안내가 남는다.
  const handleLeave = () => {
    Alert.alert(
      t("채팅방을 나갈까요?"),
      t("나가면 대화를 볼 수 없고, 다시 들어오려면 초대를 받아야 해요."),
      [
        { text: t("취소"), style: "cancel" },
        {
          text: t("나가기"),
          style: "destructive",
          onPress: () =>
            leave.mutate(undefined, {
              onSuccess: () => navigation.goBack(),
              onError: () => Alert.alert(t("나가지 못했어요"), t("잠시 후 다시 시도해주세요.")),
            }),
        },
      ],
    );
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <Header
          variant="sub"
          title={room?.name ?? t("리더 방")}
          rightAction={room ? "text" : "none"}
          rightLabel={room?.canManage ? t("관리") : t("나가기")}
          onPressRightLabel={() => {
            if (!room) return;
            if (room.canManage) navigation.navigate("LeaderRoomForm", { roomId: room.id });
            else handleLeave();
          }}
        />
      ),
    });
  }, [navigation, room, t]);

  return <ChatRoomView kind="leader" id={params.roomId} />;
}
