import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useLayoutEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Header } from "../../shared/components/base/Header";
import type { RootStackParamList } from "../../shared/types/navigation";
import { ChatRoomView } from "../chat/ChatRoomView";
import { useChatRoomDetail } from "./api";

// 팀 단톡방 대화 화면 — 본체는 셀 단톡방과 같은 ChatRoomView다.
// 오른쪽 위 ☰는 서랍(알림·사진·배경·대화 상대·관리·나가기)을 연다 (SCRUM-230).
export function ChatRoomScreen() {
  const { t } = useTranslation();
  const { params } = useRoute<RouteProp<RootStackParamList, "ChatRoom">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: room } = useChatRoomDetail(params.roomId);
  const title = room?.name ?? t("단톡방");

  // 돋보기 — 대화 검색창을 연다 (SCRUM-231)
  const [searching, setSearching] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <Header
          variant="sub"
          title={title}
          rightAction="chat"
          onPressSearch={() => setSearching(true)}
          onPressMenu={() =>
            navigation.navigate("ChatRoomInfo", { kind: "room", id: params.roomId, title })
          }
        />
      ),
    });
  }, [navigation, params.roomId, title]);

  return (
    <ChatRoomView
      kind="room"
      id={params.roomId}
      searchOpen={searching}
      onSearchClose={() => setSearching(false)}
    />
  );
}
