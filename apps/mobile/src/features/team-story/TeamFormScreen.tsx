import { useRoute, type RouteProp } from "@react-navigation/native";
import { useState } from "react";
import { KeyboardAvoidingView, ScrollView, View } from "react-native";

import { findTeam, TEAM_INTRO, TEAM_MEMBERS } from "./teams";
import { Button } from "../../shared/components/base/Button";
import { Field } from "../../shared/components/base/Field";
import { ImageUploadBoxSingle } from "../../shared/components/base/ImageUploadBoxSingle";
import { TextAreaField } from "../../shared/components/base/TextAreaField";
import { TextField } from "../../shared/components/base/TextField";
import { SelectField } from "../../shared/components/composed/SelectField";
import type { RootStackParamList } from "../../shared/types/navigation";

// 팀장 후보. 팀원 API가 생기면 실제 명단으로 바꾼다.
const LEADER_OPTIONS = TEAM_MEMBERS.map((member) => member.name);

// 팀을 새로 만들거나 기존 팀을 고치는 화면. teamId가 있으면 편집, 없으면 생성이다
// (PrayerWrite와 같은 방식). 두 모드가 폼도 항목도 같아서 화면을 나누지 않는다.
export function TeamFormScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, "TeamForm">>();
  const team = params?.teamId ? findTeam(params.teamId) : undefined;

  const [name, setName] = useState(team?.name ?? "");
  const [leader, setLeader] = useState<string | null>(
    team ? (TEAM_MEMBERS.find((member) => member.roleLabel === "팀장")?.name ?? null) : null,
  );
  const [backgroundUri, setBackgroundUri] = useState<string | null>(null);
  const [summary, setSummary] = useState(team?.description ?? "");
  const [intro, setIntro] = useState(team ? TEAM_INTRO : "");

  const handleSubmitPress = () => {
    // TODO(API): 팀 저장 연동 전 — 입력 검증까지만 동작한다.
  };

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
            options={LEADER_OPTIONS}
            value={leader}
            onChange={setLeader}
          />

          <View>
            <Field label="배경사진">
              <ImageUploadBoxSingle imageUri={backgroundUri} onChange={setBackgroundUri} />
            </Field>
          </View>

          <View>
            <TextField
              label="한 줄 소개"
              placeholder="목록에 표시될 짧은 소개를 입력하세요."
              value={summary}
              onChangeText={setSummary}
            />
          </View>

          <View>
            <TextAreaField
              label="팀 소개"
              placeholder="팀에 대한 자세한 설명을 입력하세요."
              value={intro}
              onChangeText={setIntro}
            />
          </View>

          <View className="mt-16">
            <Button
              label={team ? "저장" : "등록하기"}
              onPress={handleSubmitPress}
              disabled={
                name.trim().length === 0 ||
                leader === null ||
                summary.trim().length === 0 ||
                intro.trim().length === 0
              }
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
