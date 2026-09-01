import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { MemberPickRow } from "./components/MemberPickRow";
import { MEMBER_CANDIDATES } from "./teams";
import { SearchBar } from "../../shared/components/base/SearchBar";

// 팀에 넣을 사람을 검색해서 여러 명 고르는 화면. 고른 뒤 헤더의 "완료"로 반영한다
// (완료 동작은 RootNavigator에서 헤더에 붙인다 — 지금은 뒤로가기만 한다).
export function TeamMemberAddScreen() {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const visibleCandidates = MEMBER_CANDIDATES.filter((candidate) =>
    candidate.name.includes(query.trim()),
  );

  const handleToggle = (id: string) =>
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((it) => it !== id) : [...current, id],
    );

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
            affiliation={candidate.affiliation}
            selected={selectedIds.includes(candidate.id)}
            onPress={() => handleToggle(candidate.id)}
          />
        ))}
      </View>
    </ScrollView>
  );
}
