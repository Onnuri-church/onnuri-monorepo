import { useRoute, type RouteProp } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { ScrollView, Text, View } from "react-native";

import { fetchGroupMeetingDetail } from "./api";
import { Avatar } from "../../shared/components/base/Avatar";
import type { RootStackParamList } from "../../shared/types/navigation";

// 참여멤버 전체 보기 (상세의 "참여 멤버" 행에서 진입) — 승인된 멤버만, 가입순.
// 시안: 행 = 아바타 40 + 이름, 우측에 소그룹장 표시. 타이틀 아래 가운데 "총 N명".
export function GroupMeetingMemberListScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, "GroupMeetingMembers">>();

  // 상세를 거쳐 들어오므로 캐시가 있어 바로 그려진다 (상세와 같은 키).
  const { data: meeting } = useQuery({
    queryKey: ["group-meetings", params.meetingId],
    queryFn: () => fetchGroupMeetingDetail(params.meetingId),
  });
  const members = meeting?.members ?? [];

  return (
    <ScrollView className="bg-background-normal" contentContainerClassName="px-5 pb-10">
      <Text className="text-center text-caption-main text-text-alternative">
        총 {members.length}명
      </Text>
      <View className="mt-8">
        {members.map((member) => (
          <View
            key={member.id}
            className="flex-row items-center justify-between border-b border-text-assistive py-2.5"
          >
            <View className="flex-row items-center gap-4">
              <Avatar imageUrl={member.avatarUrl} size={40} />
              <Text className="text-body-main text-text-normal">{member.name}</Text>
            </View>
            {member.isLeader && (
              <Text className="text-body-small text-primary-normal">소그룹장</Text>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
