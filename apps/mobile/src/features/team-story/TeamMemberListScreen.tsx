import { ScrollView, Text, View } from "react-native";

import { MemberRow } from "./components/MemberRow";

// API 연동 전 임시 데이터. 팀원 엔드포인트가 생기면 교체하고, 어느 팀인지는 라우트 파라미터로 받는다.
const MEMBERS = [
  { id: "1", name: "조인승", roleLabel: "팀장" },
  { id: "2", name: "김예준", roleLabel: "팀원" },
  { id: "3", name: "김연정", roleLabel: "팀원" },
  { id: "4", name: "김영주", roleLabel: "팀원" },
  { id: "5", name: "김지은", roleLabel: "팀원" },
  { id: "6", name: "김현수", roleLabel: "팀원" },
  { id: "7", name: "남현지", roleLabel: "팀원" },
  { id: "8", name: "우성윤", roleLabel: "팀원" },
  { id: "9", name: "손호영", roleLabel: "팀원" },
];

export function TeamMemberListScreen() {
  return (
    <ScrollView className="flex-1 bg-background-normal" contentContainerClassName="px-5 pb-6">
      {/* 헤더 바로 아래 가운데 정렬 (시안 확정값) */}
      <Text className="text-center text-caption-main text-text-alternative">
        총 {MEMBERS.length}명
      </Text>
      <View className="mt-7 gap-3">
        {MEMBERS.map((member) => (
          <MemberRow key={member.id} name={member.name} roleLabel={member.roleLabel} />
        ))}
      </View>
    </ScrollView>
  );
}
