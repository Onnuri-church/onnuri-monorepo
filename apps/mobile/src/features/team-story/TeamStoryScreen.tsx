import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { useDeleteTeam, useTeams } from "./api";
import { TeamListItem } from "./components/TeamListItem";
import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { Icon, isIconName } from "../../shared/components/base/Icon";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useMe } from "../profile/useMe";

// 관리자에게는 이 탭이 곧 팀 관리다 — 행 스와이프로 편집·삭제, 목록 끝 점선 행으로 생성
// (셀 탭이 관리자에게 셀 관리로 뜨는 것과 같은 방식). 일반 유저·게스트는 목록만 본다.
export function TeamStoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: teams } = useTeams();
  const me = useMe();
  const canManage = me?.isAdmin === true;
  const deleteDialogRef = useRef<AppDialogRef>(null);
  const deleteTeam = useDeleteTeam();
  const [pendingTeamId, setPendingTeamId] = useState<string | null>(null);

  const handleDeletePress = (teamId: string) => {
    setPendingTeamId(teamId);
    deleteDialogRef.current?.open();
  };

  const handleDeleteConfirm = () => {
    if (pendingTeamId) deleteTeam.mutate(pendingTeamId);
    setPendingTeamId(null);
    deleteDialogRef.current?.close();
  };

  return (
    <View className="flex-1 bg-background-normal">
      <ScrollView contentContainerClassName="gap-4 px-5 pb-6 pt-7">
        {(teams ?? []).map((team) => (
          <TeamListItem
            key={team.id}
            name={team.name}
            description={team.tagline ?? ""}
            // iconName에는 아이콘 이름이 들어온다 (시드가 넣는 값) — 등록 안 된 이름이면 안 그린다.
            icon={isIconName(team.iconName) ? team.iconName : undefined}
            onPress={() => navigation.navigate("TeamStoryDetail", { teamId: team.id })}
            // 콜백을 안 넘기면 스와이프 액션이 안 생긴다 — 일반 유저는 목록 그대로다.
            onEditPress={
              canManage ? () => navigation.navigate("TeamForm", { teamId: team.id }) : undefined
            }
            onDeletePress={canManage ? () => handleDeletePress(team.id) : undefined}
          />
        ))}

        {/* 새 팀 만들기. 파라미터 없이 열면 폼이 생성 모드가 된다. */}
        {canManage && (
          <Pressable
            className="h-12 flex-row items-center justify-center gap-1 rounded-xl border border-dashed border-icon-normal active:opacity-60"
            onPress={() => navigation.navigate("TeamForm")}
          >
            <Icon name="plus" size={20} />
            <Text className="text-body-main text-text-alternative">팀 생성</Text>
          </Pressable>
        )}
      </ScrollView>

      <AppDialog
        ref={deleteDialogRef}
        title="정말 삭제하시겠습니까?"
        description="삭제된 데이터는 복구할 수 없습니다."
        confirmLabel="확인"
        cancelLabel="취소"
        placement="center"
        onConfirm={handleDeleteConfirm}
      />
    </View>
  );
}
