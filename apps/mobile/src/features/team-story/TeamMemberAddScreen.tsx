import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useLayoutEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { useAddTeamMembers, useTeamMemberCandidates } from "./api";
import { MemberPickRow } from "./components/MemberPickRow";
import { Header } from "../../shared/components/base/Header";
import { SearchBar } from "../../shared/components/base/SearchBar";
import type { RootStackParamList } from "../../shared/types/navigation";

// 팀에 넣을 사람을 검색해서 여러 명 고르는 화면. 헤더의 "완료"가 고른 사람을 반영하고 돌아간다 —
// 동작이 화면 상태(선택 목록)에 의존해서 화면이 헤더를 단독 등록한다 (DESIGN.md 헤더 규칙).
export function TeamMemberAddScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, "TeamMemberAdd">>();
  const navigation = useNavigation();
  const { data: candidates } = useTeamMemberCandidates(params.teamId);
  const addMembers = useAddTeamMembers(params.teamId);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const visibleCandidates = (candidates ?? []).filter((candidate) =>
    candidate.name.includes(query.trim()),
  );

  const handleToggle = (id: string) =>
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((it) => it !== id) : [...current, id],
    );

  useLayoutEffect(() => {
    const handleDonePress = async () => {
      if (selectedIds.length > 0) await addMembers.mutateAsync(selectedIds);
      navigation.goBack();
    };
    navigation.setOptions({
      header: () => (
        <Header
          variant="sub"
          title="팀원 추가"
          rightAction="text"
          rightLabel="완료"
          onPressRightLabel={handleDonePress}
        />
      ),
    });
  }, [navigation, selectedIds]);

  return (
    <ScrollView className="flex-1 bg-background-normal" contentContainerClassName="px-5 pb-6 pt-4">
      <SearchBar value={query} onChangeText={setQuery} placeholder="이름으로 검색" />

      <Text className="mt-4 text-caption-main text-text-alternative">
        {selectedIds.length}명 선택됨
      </Text>

      <View className="mt-2">
        {visibleCandidates.map((candidate) => (
          <MemberPickRow
            key={candidate.id}
            name={candidate.name}
            // 시안 문구 — 서버는 팀 이름만 주고 "없음" 표현은 화면이 정한다.
            affiliation={candidate.teamName ?? "소속 팀 없음"}
            selected={selectedIds.includes(candidate.id)}
            onPress={() => handleToggle(candidate.id)}
          />
        ))}
      </View>
    </ScrollView>
  );
}
