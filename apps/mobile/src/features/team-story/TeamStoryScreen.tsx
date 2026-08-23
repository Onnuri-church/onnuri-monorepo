import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScrollView } from "react-native";

import { TeamListItem } from "./components/TeamListItem";
import { TEAMS } from "./teams";
import type { RootStackParamList } from "../../shared/types/navigation";

export function TeamStoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <ScrollView
      className="flex-1 bg-background-normal"
      contentContainerClassName="gap-4 px-5 pb-6 pt-7"
    >
      {TEAMS.map((team) => (
        <TeamListItem
          key={team.id}
          name={team.name}
          description={team.description}
          icon={team.icon}
          onPress={() => navigation.navigate("TeamStoryDetail", { teamId: team.id })}
        />
      ))}
    </ScrollView>
  );
}
