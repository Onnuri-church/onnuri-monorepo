import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { MemberRow } from "./components/MemberRow";
import { TEAM_MEMBERS, type TeamMember } from "./teams";
import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { Icon } from "../../shared/components/base/Icon";
import { SearchBar } from "../../shared/components/base/SearchBar";
import type { RootStackParamList } from "../../shared/types/navigation";

// 팀장은 자기 자신을 뺄 수 없어서 삭제 버튼이 붙지 않는다 (시안: 팀장 행만 "팀장" 문구).
const LEADER_ROLE_LABEL = "팀장";

// 팀장이 팀원을 빼고 새로 넣는 화면. 목록은 팀 상세·팀원 리스트와 같은 행을 쓴다.
export function TeamMemberAdminScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, "TeamMemberAdmin">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const deleteDialogRef = useRef<AppDialogRef>(null);
  const [query, setQuery] = useState("");
  const [pendingMember, setPendingMember] = useState<TeamMember | null>(null);

  const visibleMembers = TEAM_MEMBERS.filter((member) => member.name.includes(query.trim()));

  const handleDeletePress = (member: TeamMember) => {
    setPendingMember(member);
    deleteDialogRef.current?.open();
  };

  const handleDeleteConfirm = () => {
    // TODO(API): 팀원 삭제 연동 전 — 팝업 흐름까지만 동작한다.
    deleteDialogRef.current?.close();
  };

  return (
    <View className="flex-1 bg-background-normal">
      <ScrollView contentContainerClassName="px-5 pb-6">
        {/* 헤더 바로 아래 가운데 정렬 (시안 확정값) */}
        <Text className="text-center text-caption-main text-text-alternative">
          총 {TEAM_MEMBERS.length}명
        </Text>

        <View className="mt-4">
          <SearchBar value={query} onChangeText={setQuery} placeholder="이름으로 검색해서 추가" />
        </View>

        <View className="mt-3 gap-3">
          {visibleMembers.map((member) => (
            <MemberRow
              key={member.id}
              name={member.name}
              roleLabel={member.roleLabel}
              onDeletePress={
                member.roleLabel === LEADER_ROLE_LABEL
                  ? undefined
                  : () => handleDeletePress(member)
              }
            />
          ))}
        </View>

        <Pressable
          className="mt-4 h-12 flex-row items-center justify-center gap-1 rounded-xl border border-dashed border-icon-normal active:opacity-60"
          onPress={() => navigation.navigate("TeamMemberAdd", { teamId: params.teamId })}
        >
          <Icon name="plus" size={20} />
          <Text className="text-body-main text-text-alternative">팀원 추가</Text>
        </Pressable>
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
