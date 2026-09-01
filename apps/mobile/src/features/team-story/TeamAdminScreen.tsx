import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { TeamListItem } from "./components/TeamListItem";
import { TEAMS, type Team } from "./teams";
import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { Icon } from "../../shared/components/base/Icon";
import type { RootStackParamList } from "../../shared/types/navigation";

// 팀을 만들고 고치고 지우는 관리 화면. 팀스토리 목록과 같은 행을 쓰되 편집·삭제 버튼이 붙는다.
// 시안은 팀스토리 화면 자체를 관리자 모드로 그렸지만, 앱에 등급 판별이 아직 없어서
// 별도 화면으로 두고 라우트로 들어온다 — 등급이 생기면 팀스토리 화면과 합칠 수 있다.
export function TeamAdminScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const deleteDialogRef = useRef<AppDialogRef>(null);
  const [pendingTeam, setPendingTeam] = useState<Team | null>(null);

  const handleDeletePress = (team: Team) => {
    setPendingTeam(team);
    deleteDialogRef.current?.open();
  };

  const handleDeleteConfirm = () => {
    // TODO(API): 팀 삭제 연동 전 — 팝업 흐름까지만 동작한다.
  };

  return (
    <View className="flex-1 bg-background-normal">
      <ScrollView contentContainerClassName="gap-4 px-5 pb-6 pt-7">
        {TEAMS.map((team) => (
          <TeamListItem
            key={team.id}
            name={team.name}
            description={team.description}
            icon={team.icon}
            onPress={() => navigation.navigate("TeamStoryDetail", { teamId: team.id })}
            onEditPress={() => navigation.navigate("TeamForm", { teamId: team.id })}
            onDeletePress={() => handleDeletePress(team)}
          />
        ))}

        {/* 새 팀 만들기. 파라미터 없이 열면 폼이 생성 모드가 된다. */}
        <Pressable
          className="h-12 flex-row items-center justify-center gap-1 rounded-xl border border-dashed border-icon-normal active:opacity-60"
          onPress={() => navigation.navigate("TeamForm")}
        >
          <Icon name="plus" size={20} />
          <Text className="text-body-main text-text-alternative">팀 생성</Text>
        </Pressable>
      </ScrollView>

      <AppDialog
        ref={deleteDialogRef}
        title="정말 삭제하시겠습니까?"
        description="삭제된 데이터는 복구할 수 없습니다."
        confirmLabel="확인"
        cancelLabel="취소"
        onConfirm={handleDeleteConfirm}
      />
    </View>
  );
}
