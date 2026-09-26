import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, ScrollView, Text, View } from "react-native";

import { toTeamRoleLabel, useTeamDetail, useTeamGallery } from "./api";
import { ActivityPhotos } from "./components/ActivityPhotos";
import { MemberRow } from "./components/MemberRow";
import { TeamBoardLink } from "./components/TeamBoardLink";
import { TeamProfile } from "./components/TeamProfile";
import { isIconName } from "../../shared/components/base/Icon";
import type { RootStackParamList } from "../../shared/types/navigation";

// 시안이 팀원을 네 명까지만 보여주고 나머지는 "외 N명 더 보기"로 접는다.
const MEMBER_PREVIEW_COUNT = 4;
// 활동 사진 섹션이 큰 사진 1장 + 작은 사진 3장을 쓴다.
const PHOTO_PREVIEW_COUNT = 4;

export function TeamStoryDetailScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, "TeamStoryDetail">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: team } = useTeamDetail(params.teamId);
  // 사진은 갤러리 조회를 같이 쓴다 — 미리보기만 잘라 쓰고 전체 장수도 여기서 센다.
  const { data: gallery } = useTeamGallery(params.teamId);

  const members = team?.members ?? [];
  const previewMembers = members.slice(0, MEMBER_PREVIEW_COUNT);
  const hiddenMemberCount = members.length - previewMembers.length;

  const allPhotos = (gallery ?? []).flatMap((month) => month.photos);

  const handleMemberListPress = () =>
    navigation.navigate("TeamMemberList", { teamId: params.teamId });
  const handleViewAllPhotosPress = () =>
    navigation.navigate("TeamStoryGallery", { teamId: params.teamId });
  // 팀 게시판은 부서활동 게시판이다 (기획 확인). 해당 팀으로 필터된 화면이 맞지만
  // 필터는 별도 티켓이라 우선 목록 전체를 연다.
  const handleBoardPress = () => navigation.navigate("DepartmentActivity");

  return (
    <ScrollView className="flex-1 bg-background-normal" contentContainerClassName="px-5 pb-10">
      <TeamProfile
        name={team?.name ?? ""}
        description={team?.tagline ?? ""}
        icon={isIconName(team?.iconName) ? team.iconName : undefined}
      />

      <View className="mt-6 gap-3">
        <Text className="text-heading-small text-text-normal">팀 소개</Text>
        <Text className="text-body-medium text-text-alternative">{team?.description ?? ""}</Text>
      </View>

      <View className="mt-12">
        <ActivityPhotos
          photos={allPhotos.slice(0, PHOTO_PREVIEW_COUNT)}
          totalCount={allPhotos.length}
          onViewAllPress={handleViewAllPhotosPress}
        />
      </View>

      <View className="mt-12 gap-3">
        <Text className="text-heading-small text-text-normal">팀원 · {members.length}명</Text>
        <View>
          {previewMembers.map((member) => (
            <MemberRow
              key={member.id}
              name={member.name}
              roleLabel={toTeamRoleLabel(member.role)}
            />
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
          title={`${team?.name ?? "팀"} 게시판`}
          description="연습 일정, 셋리스트, 공지를 확인해요"
          onPress={handleBoardPress}
        />
      </View>
    </ScrollView>
  );
}
