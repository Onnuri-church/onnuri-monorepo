import { useRoute, type RouteProp } from "@react-navigation/native";
import { ScrollView, Text, View } from "react-native";

import { toTeamRoleLabel, useTeamDetail } from "./api";
import { MemberRow } from "./components/MemberRow";
import type { RootStackParamList } from "../../shared/types/navigation";

// 팀원은 팀 상세 응답에 들어 있어서 상세 캐시를 그대로 쓴다 (상세를 거쳐 들어오므로 재요청이 없다).
export function TeamMemberListScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, "TeamMemberList">>();
  const { data: team } = useTeamDetail(params.teamId);
  const members = team?.members ?? [];

  return (
    <ScrollView className="flex-1 bg-background-normal" contentContainerClassName="px-5 pb-6">
      {/* 헤더 바로 아래 가운데 정렬 (시안 확정값) */}
      <Text className="text-center text-caption-main text-text-alternative">
        총 {members.length}명
      </Text>
      <View className="mt-7 gap-3">
        {members.map((member) => (
          <MemberRow key={member.id} name={member.name} roleLabel={toTeamRoleLabel(member.role)} />
        ))}
      </View>
    </ScrollView>
  );
}
