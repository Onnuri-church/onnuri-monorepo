import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTeamDetail, useTeamGallery } from "./api";
import { ActivityPhotos } from "./components/ActivityPhotos";
import { TeamBoardLink } from "./components/TeamBoardLink";
import { TeamProfile } from "./components/TeamProfile";
import { Icon, isIconName } from "../../shared/components/base/Icon";
import { useMe } from "../profile/useMe";
import type { RootStackParamList } from "../../shared/types/navigation";

// 활동 사진 섹션이 큰 사진 1장 + 작은 사진 3장을 쓴다.
const PHOTO_PREVIEW_COUNT = 4;

export function TeamStoryDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { params } = useRoute<RouteProp<RootStackParamList, "TeamStoryDetail">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: team } = useTeamDetail(params.teamId);
  // 사진은 갤러리 조회를 같이 쓴다 — 미리보기만 잘라 쓰고 전체 장수도 여기서 센다.
  const { data: gallery } = useTeamGallery(params.teamId);

  // 소속팀 공간은 그 팀 팀원과 관리자에게만 보인다 (서버도 같은 규칙).
  const me = useMe();
  const canChat =
    me?.isAdmin === true || (me?.teams ?? []).some((item) => item.id === params.teamId);

  const members = team?.members ?? [];

  const allPhotos = (gallery ?? []).flatMap((month) => month.photos);

  const handleMemberListPress = () =>
    navigation.navigate("TeamMemberList", { teamId: params.teamId });
  const handleViewAllPhotosPress = () =>
    navigation.navigate("TeamStoryGallery", { teamId: params.teamId });
  // 팀 게시판은 부서활동 게시판이다 (기획 확인) — 이 팀으로 필터된 채 연다.
  const handleBoardPress = () =>
    navigation.navigate("DepartmentActivity", { teamId: params.teamId });

  return (
    <ScrollView
      className="flex-1 bg-background-normal"
      contentContainerClassName="px-5"
      contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
    >
      <TeamProfile
        name={team?.name ?? ""}
        description={team?.tagline ?? ""}
        icon={isIconName(team?.iconName) ? team.iconName : undefined}
      />

      <View className="mt-6 gap-3">
        <Text className="text-heading-small text-text-normal">{t("팀 소개")}</Text>
        <Text className="text-body-medium text-text-alternative">{team?.description ?? ""}</Text>
      </View>

      <View className="mt-12">
        <ActivityPhotos
          photos={allPhotos.slice(0, PHOTO_PREVIEW_COUNT)}
          totalCount={allPhotos.length}
          onViewAllPress={handleViewAllPhotosPress}
        />
      </View>

      {/* 팀원은 목록을 펼쳐 두지 않고, 줄 전체를 눌러 팀원 목록 페이지로 들어간다. */}
      <Pressable
        className="mt-12 h-7 flex-row items-center justify-between active:opacity-60"
        onPress={handleMemberListPress}
        hitSlop={8}
      >
        <Text className="text-heading-small text-text-normal">
          {t("팀원 · {{count}}명", { count: members.length })}
        </Text>
        <Icon name="expand-right" size={28} />
      </Pressable>

      {canChat && (
        <View className="mt-12">
          <TeamBoardLink
            title={t("{{name}} 소속팀 공간", { name: team?.name ?? t("팀") })}
            description={t("팀원만 볼 수 있는 게시판과 단톡방")}
            onPress={() => navigation.navigate("TeamSpace", { teamId: params.teamId })}
          />
        </View>
      )}

      <View className="mt-12">
        <TeamBoardLink
          title={t("{{name}} 게시판", { name: team?.name ?? t("팀") })}
          description={t("연습 일정, 셋리스트, 공지를 확인해요")}
          onPress={handleBoardPress}
        />
      </View>
    </ScrollView>
  );
}
