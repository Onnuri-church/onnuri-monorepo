import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, ScrollView, View } from "react-native";

import { useCreateTeam, useTeamDetail, useUpdateTeam } from "./api";
import { uploadImage } from "../../shared/api/upload";
import { Button } from "../../shared/components/base/Button";
import { Field } from "../../shared/components/base/Field";
import { ImageUploadBoxSingle } from "../../shared/components/base/ImageUploadBoxSingle";
import { TextAreaField } from "../../shared/components/base/TextAreaField";
import { TextField } from "../../shared/components/base/TextField";
import { SelectField } from "../../shared/components/composed/SelectField";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useAdminMembers } from "../admin/api";

// 팀을 새로 만들거나 기존 팀을 고치는 화면. teamId가 있으면 편집, 없으면 생성이다.
// 두 모드가 폼도 항목도 같아서 화면을 나누지 않는다. 진입은 팀 관리(관리자의 팀스토리 탭)에서만.
export function TeamFormScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, "TeamForm">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const teamId = params?.teamId;
  const { data: team } = useTeamDetail(teamId ?? "");

  // 팀장 선택지 — 관리자 전용 회원 목록. SelectField가 문자열만 다뤄서 이름으로 고르고
  // id로 되돌린다 (셀 생성 폼과 같은 방식).
  // TODO(동명이인): 이름이 겹치면 먼저 찾은 회원이 잡힌다 — 검색 선택 UI로 바꿀 때 함께 해결.
  const { data: members } = useAdminMembers();
  const memberNames = (members ?? []).map((member) => member.name);
  const findMemberIdByName = (name: string | null) =>
    (members ?? []).find((member) => member.name === name)?.id ?? null;

  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam(teamId ?? "");

  const [name, setName] = useState("");
  const [leaderName, setLeaderName] = useState<string | null>(null);
  // 커버는 기존 저장 주소(http) 또는 새로 고른 로컬 사진(file://)을 한 상태로 들고,
  // 저장할 때 로컬이면 업로드해서 주소로 바꾼다 (uploadImage가 http는 그대로 통과).
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");

  // 편집 모드 프리필 — 상세를 받아온 뒤에 채운다 (PrayerWrite와 같은 방식).
  useEffect(() => {
    if (!team) return;
    setName(team.name);
    setLeaderName(team.members.find((member) => member.role === "LEADER")?.name ?? null);
    setCoverUri(team.coverImageUrl);
    setTagline(team.tagline ?? "");
    setDescription(team.description ?? "");
  }, [team]);

  const handleSubmitPress = async () => {
    const leaderId = findMemberIdByName(leaderName);
    if (!leaderId) return;

    const coverImageUrl = coverUri ? await uploadImage(coverUri) : null;
    const body = { name, leaderId, tagline, description, coverImageUrl };
    if (teamId) {
      await updateTeam.mutateAsync(body);
    } else {
      await createTeam.mutateAsync(body);
    }
    navigation.goBack();
  };

  const submitting = createTeam.isPending || updateTeam.isPending;

  return (
    <View className="flex-1 bg-background-normal">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          className="h-full flex-1"
          contentContainerClassName="justify-start gap-8 px-5 pb-20 pt-8"
          keyboardShouldPersistTaps="handled"
        >
          <View>
            {/* 시안에서 팀 이름만 안내 문구가 없다. */}
            <TextField label="팀 이름" placeholder="" value={name} onChangeText={setName} />
          </View>

          <SelectField
            label="팀장"
            placeholder="팀장 이름을 선택해주세요."
            options={memberNames}
            value={leaderName}
            onChange={setLeaderName}
          />

          <View>
            <Field label="배경사진">
              <ImageUploadBoxSingle imageUri={coverUri} onChange={setCoverUri} />
            </Field>
          </View>

          <View>
            <TextField
              label="한 줄 소개"
              placeholder="목록에 표시될 짧은 소개를 입력하세요."
              value={tagline}
              onChangeText={setTagline}
            />
          </View>

          <View>
            <TextAreaField
              label="팀 소개"
              placeholder="팀에 대한 자세한 설명을 입력하세요."
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <View className="mt-16">
            <Button
              label={teamId ? "저장" : "등록하기"}
              onPress={handleSubmitPress}
              disabled={
                submitting ||
                name.trim().length === 0 ||
                leaderName === null ||
                tagline.trim().length === 0 ||
                description.trim().length === 0
              }
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
