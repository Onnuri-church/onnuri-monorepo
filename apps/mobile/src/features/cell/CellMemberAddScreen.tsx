import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useLayoutEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";

import { Header } from "../../shared/components/base/Header";
import { SearchBar } from "../../shared/components/base/SearchBar";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useAddCellMembers, useAdminMembers } from "../admin/api";
import { MemberPickRow } from "../team-story/components/MemberPickRow";
import { useCellDetail } from "./api";

// 셀에 넣을 사람을 검색해서 여러 명 고르는 화면 (관리자 전용). 헤더 "완료"가 고른 사람을 반영하고
// 돌아간다. 이미 이 셀인 사람은 목록에서 뺀다 — 다른 셀 사람을 고르면 그 셀에서 이 셀로 옮겨진다.
export function CellMemberAddScreen() {
  const { t } = useTranslation();
  const { params } = useRoute<RouteProp<RootStackParamList, "CellMemberAdd">>();
  const navigation = useNavigation();
  const { data: members } = useAdminMembers();
  const { data: cellData } = useCellDetail(params.cellId);
  const addMembers = useAddCellMembers(params.cellId);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const inCell = new Set((cellData?.members ?? []).map((member) => member.id));
  const candidates = (members ?? []).filter(
    (member) => !inCell.has(member.id) && member.name.includes(query.trim()),
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
          title={t("셀원 추가")}
          rightAction="text"
          rightLabel={t("완료")}
          onPressRightLabel={handleDonePress}
        />
      ),
    });
  }, [navigation, selectedIds, t, addMembers]);

  return (
    <ScrollView
      className="flex-1 bg-background-normal"
      contentContainerClassName="px-5 pb-6 pt-4"
      keyboardShouldPersistTaps="handled"
    >
      <SearchBar value={query} onChangeText={setQuery} placeholder={t("이름으로 검색")} />

      <Text className="mt-4 text-caption-main text-text-alternative">
        {t("{{count}}명 선택됨", { count: selectedIds.length })}
      </Text>

      <View className="mt-2">
        {candidates.map((candidate) => (
          <MemberPickRow
            key={candidate.id}
            name={candidate.name}
            affiliation={candidate.cellName ?? t("소속 셀 없음")}
            selected={selectedIds.includes(candidate.id)}
            onPress={() => handleToggle(candidate.id)}
          />
        ))}
      </View>
    </ScrollView>
  );
}
