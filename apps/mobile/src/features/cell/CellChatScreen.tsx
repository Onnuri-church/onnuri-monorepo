import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";

import { Header } from "../../shared/components/base/Header";
import type { RootStackParamList } from "../../shared/types/navigation";
import { ChatRoomView } from "../chat/ChatRoomView";
import { useCell } from "./api";

// 셀 단톡방 — 그 셀 셀원과 관리자만 들어온다. 본체는 팀 단톡방과 같은 ChatRoomView다.
export function CellChatScreen() {
  const { t } = useTranslation();
  const { params } = useRoute<RouteProp<RootStackParamList, "CellChat">>();
  const navigation = useNavigation();
  const cell = useCell(params.cellId);

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <Header
          variant="sub"
          title={t("{{name}} 단톡방", { name: cell?.name ?? t("셀") })}
          rightAction="none"
        />
      ),
    });
  }, [navigation, cell?.name, t]);

  return <ChatRoomView kind="cell" id={params.cellId} />;
}
