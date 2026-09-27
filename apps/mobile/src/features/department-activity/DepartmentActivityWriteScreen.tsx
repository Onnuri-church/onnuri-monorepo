import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, ScrollView, View } from "react-native";

import { createTeamActivity, fetchTeamActivities } from "./api";
import { Button } from "../../shared/components/base/Button";
import { Field } from "../../shared/components/base/Field";
import { ImageUploadBoxMultiple } from "../../shared/components/base/ImageUploadBoxMultiple";
import { TextAreaField } from "../../shared/components/base/TextAreaField";
import { TextField } from "../../shared/components/base/TextField";
import { DateField, toDateString } from "../../shared/components/composed/DateField";
import { SelectField } from "../../shared/components/composed/SelectField";
import { uploadImage } from "../../shared/api/upload";
import type { RootStackParamList } from "../../shared/types/navigation";

export function DepartmentActivityWriteScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();

  const [selectDate, setSelectDate] = useState<string | null>(toDateString(new Date()));
  const [teamName, setTeamName] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [content, setContent] = useState("");

  // 부서 선택지는 목록 응답에 담겨 오는 팀 목록을 그대로 쓴다 — 목록 화면과 같은 캐시 키라
  // 목록을 보고 들어오면 이미 받아둔 값으로 바로 채워진다.
  const { data } = useQuery({
    queryKey: ["team-activities", ""],
    queryFn: () => fetchTeamActivities(undefined),
  });
  const teams = data?.teams ?? [];

  const { mutate: submit, isPending } = useMutation({
    mutationFn: async (eventDate: string) => {
      const teamId = teams.find((team) => team.name === teamName)?.id;
      if (!teamId) throw new Error("팀을 찾을 수 없습니다.");

      // 사진은 기기 경로(file://)라 글에 담기 전에 URL로 바꾼다. 한 장이라도 실패하면
      // 글을 저장하지 않는다 — 사진이 빠진 채 올라가면 올린 줄 알고 그냥 넘어간다.
      const imageUrls = await Promise.all(photoUris.map(uploadImage));

      return createTeamActivity({
        teamId,
        title: title.trim(),
        content: content.trim(),
        eventDate,
        imageUrls,
      });
    },

    onSuccess: (post) => {
      // 목록 카드의 날짜 문구·조회수는 서버가 만드는 값이라 다시 받는다.
      // 상세는 방금 받은 글이 곧 최신이라 요청 없이 캐시에 바로 넣는다.
      void queryClient.invalidateQueries({ queryKey: ["team-activities"] });
      queryClient.setQueryData(["team-activity", post.id], post);
      navigation.goBack();
    },

    onError: () => {
      Alert.alert("등록하지 못했어요", "잠시 후 다시 시도해주세요.");
    },
  });

  const canSubmit =
    selectDate !== null &&
    teamName !== null &&
    title.trim().length > 0 &&
    content.trim().length > 0;

  const handleSubmitPress = () => {
    if (selectDate === null) return;
    submit(selectDate);
  };

  return (
    <View className="flex-1 bg-background-normal">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          className="flex-1 h-full"
          contentContainerClassName="justify-start pt-8 pb-20 px-5 gap-8"
          keyboardShouldPersistTaps="handled"
        >
          <DateField
            label="날짜"
            placeholder="날짜를 입력해주세요"
            value={selectDate}
            onChange={setSelectDate}
          />

          <SelectField
            label="부서"
            placeholder="부서를 선택하세요."
            options={teams.map((team) => team.name)}
            value={teamName}
            onChange={setTeamName}
          />

          <Field label="사진(최대 5장)">
            <ImageUploadBoxMultiple imageUris={photoUris} onChange={setPhotoUris} />
          </Field>

          <TextField
            label="제목"
            placeholder="제목을 입력해주세요."
            value={title}
            onChangeText={setTitle}
          />

          <TextAreaField
            label="내용"
            placeholder={
              "오늘 은혜받은 말씀을 기록해보세요!\n욕설 및 비방은 예고 없이 삭제될 수 있어요."
            }
            value={content}
            onChangeText={setContent}
          />

          <View className="mt-16">
            {/* 등록 중에도 막는다 — 사진 업로드까지 끝나야 응답이 와서 두 번 눌리기 쉽다. */}
            <Button
              label="등록하기"
              onPress={handleSubmitPress}
              disabled={!canSubmit || isPending}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
