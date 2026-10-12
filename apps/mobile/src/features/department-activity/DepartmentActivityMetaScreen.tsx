import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView, View } from "react-native";

import { fetchTeamActivities, fetchTeamActivity } from "./api";
import { writableTeamNames } from "./permissions";
import { Button } from "../../shared/components/base/Button";
import { KeyboardAvoidingContainer } from "../../shared/components/base/KeyboardAvoidingContainer";
import { TextField } from "../../shared/components/base/TextField";
import { DateField, toDateString } from "../../shared/components/composed/DateField";
import { SelectField } from "../../shared/components/composed/SelectField";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useMe } from "../profile/useMe";

// 부서활동 글쓰기 1단계 — 날짜, 부서, 제목을 먼저 정하고 "확인"을 누르면 본문 작성 화면(팀 게시판 글쓰기와
// 같은 모양)으로 넘어간다. postId가 있으면 수정 모드라 기존 값이 채워지고 부서는 바꿀 수 없다.
export function DepartmentActivityMetaScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "DepartmentActivityMeta">>();
  const postId = route.params?.postId;
  const isEditing = postId !== undefined;

  const { data: editing } = useQuery({
    queryKey: ["team-activity", postId ?? ""],
    queryFn: () => fetchTeamActivity(postId ?? ""),
    enabled: isEditing,
  });
  // 부서 선택지는 목록 응답에 담겨 오는 팀 목록을 그대로 쓴다 (목록 화면과 같은 캐시 키).
  const { data } = useQuery({
    queryKey: ["team-activities", ""],
    queryFn: () => fetchTeamActivities(undefined),
  });
  const teams = data?.teams ?? [];
  const me = useMe();

  const [selectDate, setSelectDate] = useState<string | null>(toDateString(new Date()));
  const [teamName, setTeamName] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (prefilled || !editing) return;
    setSelectDate(editing.eventDate);
    setTeamName(editing.teamName);
    setTitle(editing.title);
    setPrefilled(true);
  }, [editing, prefilled]);

  // 고를 수 있는 부서는 내가 쓸 수 있는 곳뿐이다 (관리자는 전체). 수정 모드는 그 글의 팀 하나로 고정한다.
  const teamNames = isEditing
    ? editing
      ? [editing.teamName]
      : []
    : writableTeamNames(me, teams.map((team) => team.name));

  // 소속이 하나뿐이면 고를 게 없으니 미리 채워둔다.
  useEffect(() => {
    if (teamName === null && teamNames.length === 1) setTeamName(teamNames[0]);
  }, [teamName, teamNames]);

  const handleConfirmPress = () => {
    // 못 누르게 막지 않고, 무엇이 비었는지 알려준다 — 회색 버튼만 보이면 왜 안 되는지 알 수 없다.
    if (selectDate === null) {
      Alert.alert(t("날짜를 선택해주세요."));
      return;
    }
    if (teamName === null) {
      Alert.alert(
        t("부서를 선택해주세요."),
        teamNames.length === 0 ? t("글을 쓸 수 있는 부서가 없어요. 팀에 소속돼야 해요.") : undefined,
      );
      return;
    }
    if (title.trim().length === 0) {
      Alert.alert(t("제목을 입력해주세요."), t("제목은 한 글자 이상 있어야 해요."));
      return;
    }
    const teamId = isEditing
      ? editing?.teamId
      : teams.find((team) => team.name === teamName)?.id;
    if (!teamId) {
      Alert.alert(t("부서를 찾을 수 없어요"), t("잠시 후 다시 시도해주세요."));
      return;
    }
    navigation.navigate("DepartmentActivityWrite", {
      postId,
      teamId,
      teamName,
      title: title.trim(),
      eventDate: selectDate,
    });
  };

  return (
    <View className="flex-1 bg-background-normal">
      <KeyboardAvoidingContainer>
        <ScrollView
          className="flex-1"
          contentContainerClassName="justify-start gap-8 px-5 pb-10 pt-8"
          keyboardShouldPersistTaps="handled"
        >
          <DateField
            label={t("날짜")}
            placeholder={t("날짜를 입력해주세요")}
            value={selectDate}
            onChange={setSelectDate}
          />

          <SelectField
            label={t("부서")}
            placeholder={t("부서를 선택하세요.")}
            options={teamNames}
            value={teamName}
            onChange={setTeamName}
          />

          <TextField
            label={t("제목")}
            placeholder={t("제목을 입력해주세요.")}
            value={title}
            onChangeText={setTitle}
          />
        </ScrollView>

        <View className="px-5 pb-12 pt-3">
          <Button label={t("확인")} onPress={handleConfirmPress} />
        </View>
      </KeyboardAvoidingContainer>
    </View>
  );
}
