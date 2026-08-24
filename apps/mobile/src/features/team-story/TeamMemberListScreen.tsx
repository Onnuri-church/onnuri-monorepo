import { ScrollView, Text, View } from "react-native";

import { MemberRow } from "./components/MemberRow";
import { TEAM_MEMBERS } from "./teams";

// 어느 팀인지는 라우트 파라미터(teamId)로 받지만, 목업이 팀별로 나뉘어 있지 않아 아직 쓰지 않는다.
// 팀원 API가 생기면 그때 파라미터로 조회한다.
export function TeamMemberListScreen() {
  return (
    <ScrollView className="flex-1 bg-background-normal" contentContainerClassName="px-5 pb-6">
      {/* 헤더 바로 아래 가운데 정렬 (시안 확정값) */}
      <Text className="text-center text-caption-main text-text-alternative">
        총 {TEAM_MEMBERS.length}명
      </Text>
      <View className="mt-7 gap-3">
        {TEAM_MEMBERS.map((member) => (
          <MemberRow key={member.id} name={member.name} roleLabel={member.roleLabel} />
        ))}
      </View>
    </ScrollView>
  );
}
