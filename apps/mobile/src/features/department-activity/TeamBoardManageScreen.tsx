import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { ScrollView, Text, View } from "react-native";

import { fetchTeamActivities } from "./api";
import { TeamPostCard } from "./components/TeamPostCard";
import { Skeleton } from "../../shared/components/base/Skeleton";
import type { RootStackParamList } from "../../shared/types/navigation";
import { toTimeAgo } from "../../shared/utils/date";

// 팀장 "게시판 관리" (마이페이지 관리 카드) — 자기 팀 부서활동 글만 모아 보여준다.
// 수정·삭제는 상세의 ⋮에서 한다 (팀장은 팀원 글도 가능 — 서버 canManage 기준).
// 게시판과 같은 카드를 쓰되, 팀이 하나로 고정이라 필터 칩과 글쓰기 버튼은 없다.
export function TeamBoardManageScreen() {
  const { teamId } = useRoute<RouteProp<RootStackParamList, "TeamBoardManage">>().params;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { data, isPending, isError } = useQuery({
    queryKey: ["team-activities", teamId],
    queryFn: () => fetchTeamActivities(teamId),
  });

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

  if (isError || !data) {
    return (
      <View className="flex-1 items-center justify-center bg-background-normal">
        <Text className="text-body-medium text-text-alternative">
          게시글을 불러오지 못했어요
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-normal">
      {data.items.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-body-medium text-text-alternative">
            아직 우리 팀 게시글이 없어요
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerClassName="justify-start pb-11 px-5 gap-3 pt-4">
          {data.items.map((item) => (
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
              onPress={() => navigation.navigate("DepartmentActivityDetail", { id: item.id })}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
