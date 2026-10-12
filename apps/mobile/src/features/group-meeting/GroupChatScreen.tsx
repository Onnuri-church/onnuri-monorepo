import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";

import { Header } from "../../shared/components/base/Header";
import type { RootStackParamList } from "../../shared/types/navigation";
import { ChatRoomView } from "../chat/ChatRoomView";
import { fetchGroupMeetingDetail } from "./api";

// 취향소그룹 단톡방 — 승인된 참여자, 소그룹장, 관리자만 들어온다 (서버도 같은 규칙).
// 본체는 팀·셀 단톡방과 같은 ChatRoomView다. 방 이름은 소그룹 제목이다.
export function GroupChatScreen() {
  const { t } = useTranslation();
  const { params } = useRoute<RouteProp<RootStackParamList, "GroupChat">>();
  const navigation = useNavigation();
  // 상세를 거쳐 들어오므로 캐시에 있다.
  const { data: meeting } = useQuery({
    queryKey: ["group-meetings", params.meetingId],
    queryFn: () => fetchGroupMeetingDetail(params.meetingId),
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <Header
          variant="sub"
          title={t("{{name}} 단톡방", { name: meeting?.title ?? t("소그룹") })}
          rightAction="none"
        />
      ),
    });
  }, [navigation, meeting?.title, t]);

  return <ChatRoomView kind="group" id={params.meetingId} />;
}
