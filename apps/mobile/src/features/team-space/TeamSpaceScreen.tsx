import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { ManageLinkCard } from "../cell/components/ManageLinkCard";
import type { RootStackParamList } from "../../shared/types/navigation";

// 소속팀 공간 — 그 팀 팀원과 관리자만 들어온다. 안에 "게시판"(팀원끼리 글·사진·파일을 나누는 곳)과
// "단톡방"(팀장이 팀원 중 골라서 만드는 대화방)이 있다. 공개 부서활동 게시판과는 별개다.
export function TeamSpaceScreen() {
  const { t } = useTranslation();
  const { params } = useRoute<RouteProp<RootStackParamList, "TeamSpace">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View className="flex-1 gap-4 bg-background-normal px-5 pt-6">
      <ManageLinkCard
        title={t("팀 게시판")}
        description={t("팀원끼리 글·사진·파일을 나눠요")}
        onPress={() => navigation.navigate("TeamBoard", { teamId: params.teamId })}
      />
      <ManageLinkCard
        title={t("팀 단톡방")}
        description={t("팀장이 만든 대화방에서 이야기를 나눠요")}
        onPress={() => navigation.navigate("ChatRoomList", { teamId: params.teamId })}
      />
    </View>
  );
}
