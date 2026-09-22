import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScrollView } from "react-native";

import { useTeams } from "./api";
import { TeamListItem } from "./components/TeamListItem";
import { isIconName } from "../../shared/components/base/Icon";
import type { RootStackParamList } from "../../shared/types/navigation";

export function TeamStoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: teams } = useTeams();

  return (
    <ScrollView
      className="flex-1 bg-background-normal"
      contentContainerClassName="gap-4 px-5 pb-6 pt-7"
    >
      {(teams ?? []).map((team) => (
        <TeamListItem
          key={team.id}
          name={team.name}
          description={team.tagline ?? ""}
          // iconName에는 아이콘 이름이 들어온다 (시드가 넣는 값) — 등록 안 된 이름이면 안 그린다.
          icon={isIconName(team.iconName) ? team.iconName : undefined}
          onPress={() => navigation.navigate("TeamStoryDetail", { teamId: team.id })}
        />
      ))}
    </ScrollView>
  );
}
