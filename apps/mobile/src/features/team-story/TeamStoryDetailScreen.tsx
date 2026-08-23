import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, ScrollView, Text, View } from "react-native";

import { MemberRow } from "./components/MemberRow";
import { ActivityPhotos } from "./components/ActivityPhotos";
import { TeamBoardLink } from "./components/TeamBoardLink";
import { TeamProfile } from "./components/TeamProfile";
import { findTeam, TEAM_INTRO, TEAM_MEMBERS, TEAM_PHOTOS, TEAM_PHOTO_TOTAL } from "./teams";
import type { RootStackParamList } from "../../shared/types/navigation";

// 시안이 팀원을 네 명까지만 보여주고 나머지는 "외 N명 더 보기"로 접는다.
const MEMBER_PREVIEW_COUNT = 4;

export function TeamStoryDetailScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, "TeamStoryDetail">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const team = findTeam(params.teamId);

  // 팀 목록에서만 들어오므로 못 찾는 경우는 없다. 타입을 좁히려고 둔다.
  if (!team) {
    return null;
  }

  const previewMembers = TEAM_MEMBERS.slice(0, MEMBER_PREVIEW_COUNT);
  const hiddenMemberCount = TEAM_MEMBERS.length - previewMembers.length;

  const handleMemberListPress = () => navigation.navigate("TeamMemberList", { teamId: team.id });
  const handleViewAllPhotosPress = () =>
    navigation.navigate("TeamStoryGallery", { teamId: team.id });
  // 팀 게시판은 아직 화면이 없다. 생기면 여기서 navigate를 붙인다.
  const handleBoardPress = () => {};

  return (
    <ScrollView className="flex-1 bg-background-normal" contentContainerClassName="px-5 pb-10">
      <TeamProfile name={team.name} description={team.description} icon={team.icon} />

      <View className="mt-6 gap-3">
        <Text className="text-heading-small text-text-normal">팀 소개</Text>
        <Text className="text-body-medium text-text-alternative">{TEAM_INTRO}</Text>
      </View>

      <View className="mt-12">
        <ActivityPhotos
          photos={TEAM_PHOTOS}
          totalCount={TEAM_PHOTO_TOTAL}
          onViewAllPress={handleViewAllPhotosPress}
        />
      </View>

      <View className="mt-12 gap-3">
        <Text className="text-heading-small text-text-normal">
          팀원 · {TEAM_MEMBERS.length}명
        </Text>
        <View>
          {previewMembers.map((member) => (
            <MemberRow key={member.id} name={member.name} roleLabel={member.roleLabel} />
          ))}
          {hiddenMemberCount > 0 && (
            <Pressable className="mt-3" onPress={handleMemberListPress}>
              <Text className="text-caption-main text-text-alternative">
                외 {hiddenMemberCount}명 더 보기
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <View className="mt-20">
        <TeamBoardLink
          title={`${team.name} 게시판`}
          description="연습 일정, 셋리스트, 공지를 확인해요"
          onPress={handleBoardPress}
        />
      </View>
    </ScrollView>
  );
}
