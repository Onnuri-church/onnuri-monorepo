import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { fetchTeamActivities } from "./api";
import { canWriteTeamActivity } from "./permissions";
import { TeamPostCard } from "./components/TeamPostCard";
import { FilterBar } from "../../shared/components/base/FilterBar";
import { FloatingButton } from "../../shared/components/base/FloatingButton";
import { Icon } from "../../shared/components/base/Icon";
import { Skeleton } from "../../shared/components/base/Skeleton";
import { colors } from "../../shared/theme/tokens";
import { useMe } from "../profile/useMe";
import type { RootStackParamList } from "../../shared/types/navigation";
import { toTimeAgo } from "../../shared/utils/date";

// "전체" 칩의 값. 서버는 teamId를 생략하면 전체를 주므로 빈 문자열을 보내지 않고 지운다.
const ALL_TEAMS = "";

export function DepartmentActivityScreen() {
  const [teamId, setTeamId] = useState<string>(ALL_TEAMS);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // 글은 자기 부서에만 쓸 수 있다(관리자 제외). 소속이 없으면 어느 부서에도 못 쓰므로
  // 버튼 자체를 감춘다 — 누를 수 있는데 서버가 403으로 막으면 이유를 알 수 없다.
  const canWrite = canWriteTeamActivity(useMe());

  const { data, isPending, isError } = useQuery({
    queryKey: ["team-activities", teamId],
    queryFn: () => fetchTeamActivities(teamId || undefined),
    // 팀을 바꾸는 동안 이전 응답을 유지한다 — 안 그러면 필터 줄까지 스켈레톤으로 사라진다.
    placeholderData: keepPreviousData,
  });

  const handleCardPress = (id: string) => {
    navigation.navigate("DepartmentActivityDetail", { id });
  };

  const handleWritePress = () => {
    navigation.navigate("DepartmentActivityWrite");
  };

  if (isPending) {
    return (
      <View className="flex-1 bg-background-normal">
        <View className="gap-3 px-5 py-4">
          <Skeleton className="h-36 rounded-3xl" />
          <Skeleton className="h-36 rounded-3xl" />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-background-normal">
        <Text className="text-body-medium text-text-alternative">
          부서활동을 불러오지 못했어요
        </Text>
      </View>
    );
  }

  const { teams, selectedTeamId, items } = data;
  // "전체"는 서버가 모르는 선택지라 앱이 맨 앞에 붙인다.
  const filterItems = [
    { value: ALL_TEAMS, label: "전체" },
    ...teams.map((team) => ({ value: team.id, label: team.name })),
  ];

  return (
    <View className="flex-1 bg-background-normal">
      {/* 요청한 teamId가 아니라 서버가 고른 값을 표시한다 — 없는 팀으로 걸러달라고 하면
          서버가 전체로 되돌리는데, 요청값을 쓰면 칩과 목록이 어긋난다. */}
      <FilterBar
        items={filterItems}
        selected={selectedTeamId ?? ALL_TEAMS}
        onSelect={setTeamId}
      />
      <ScrollView contentContainerClassName="justify-start pb-11 px-5 gap-3">
        {items.map((item) => (
          <TeamPostCard
            key={item.id}
            post={{
              id: item.id,
              department: item.department,
              categoryName: item.teamName,
              date: item.dateLabel,
              title: item.title,
              description: item.description,
              // 상대 시각은 서버가 문구로 주면 캐시에 굳은 채 남아서 앱이 계산한다.
              time: toTimeAgo(item.createdAt),
              view: item.viewCount,
              comments: item.commentCount,
              favorite: item.likeCount,
            }}
            onPress={() => handleCardPress(item.id)}
          />
        ))}
      </ScrollView>
      {canWrite && (
        <FloatingButton onPress={handleWritePress}>
          <Icon name="write" color={colors.icon.disable} />
        </FloatingButton>
      )}
    </View>
  );
}
