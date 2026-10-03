import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, ScrollView, View } from "react-native";

import { createTeamActivity, fetchTeamActivities, fetchTeamActivity, updateTeamActivity } from "./api";
import { writableTeamNames } from "./permissions";
import { Button } from "../../shared/components/base/Button";
import { Field } from "../../shared/components/base/Field";
import { ImageUploadBoxMultiple } from "../../shared/components/base/ImageUploadBoxMultiple";
import { TextAreaField } from "../../shared/components/base/TextAreaField";
import { TextField } from "../../shared/components/base/TextField";
import { DateField, toDateString } from "../../shared/components/composed/DateField";
import { SelectField } from "../../shared/components/composed/SelectField";
import { uploadImage } from "../../shared/api/upload";
import { useMe } from "../profile/useMe";
import type { RootStackParamList } from "../../shared/types/navigation";

// 작성·수정 겸용 — postId가 있으면 수정 모드. 상세를 거쳐 들어오므로 캐시가 있어
// 첫 렌더에 프리필된다 (CellNewsWriteScreen과 같은 방식).
export function DepartmentActivityWriteScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "DepartmentActivityWrite">>();
  const postId = route.params?.postId;
  const isEditing = postId !== undefined;
  const queryClient = useQueryClient();

  const { data: editing } = useQuery({
    queryKey: ["team-activity", postId ?? ""],
    queryFn: () => fetchTeamActivity(postId ?? ""),
    enabled: isEditing,
  });

  const [selectDate, setSelectDate] = useState<string | null>(
    isEditing ? (editing?.eventDate ?? null) : toDateString(new Date()),
  );
  const [teamName, setTeamName] = useState<string | null>(editing?.teamName ?? null);
  const [title, setTitle] = useState(editing?.title ?? "");
  // 기존 사진(http)과 새로 고른 사진(file://)이 섞여 있어도 uploadImage가 http는 통과시킨다.
  const [photoUris, setPhotoUris] = useState<string[]>(editing?.imageUrls ?? []);
  const [content, setContent] = useState(editing?.content ?? "");

  // 부서 선택지는 목록 응답에 담겨 오는 팀 목록을 그대로 쓴다 — 목록 화면과 같은 캐시 키라
  // 목록을 보고 들어오면 이미 받아둔 값으로 바로 채워진다.
  const { data } = useQuery({
    queryKey: ["team-activities", ""],
    queryFn: () => fetchTeamActivities(undefined),
  });
  const teams = data?.teams ?? [];
  // 고를 수 있는 부서는 내가 쓸 수 있는 곳뿐이다 (관리자는 전체). 서버가 같은 규칙으로
  // 막으므로, 못 쓰는 부서를 선택지에 두면 고른 뒤에야 403을 만나게 된다.
  // 수정 모드는 팀을 못 바꾼다 (서버도 안 받는다) — 선택지를 그 팀 하나로 고정한다.
  const me = useMe();
  const teamNames = isEditing
    ? editing
      ? [editing.teamName]
      : []
    : writableTeamNames(me, teams.map((team) => team.name));

  // 소속이 하나뿐이면 고를 게 없으니 미리 채워둔다.
  useEffect(() => {
    if (teamName === null && teamNames.length === 1) setTeamName(teamNames[0]);
  }, [teamName, teamNames]);

  const { mutate: submit, isPending } = useMutation({
    mutationFn: async (eventDate: string) => {
      // 사진은 기기 경로(file://)라 글에 담기 전에 URL로 바꾼다. 한 장이라도 실패하면
      // 글을 저장하지 않는다 — 사진이 빠진 채 올라가면 올린 줄 알고 그냥 넘어간다.
      const imageUrls = await Promise.all(photoUris.map(uploadImage));

      if (isEditing && postId) {
        return updateTeamActivity(postId, {
          title: title.trim(),
          content: content.trim(),
          eventDate,
          imageUrls,
        });
      }

      const teamId = teams.find((team) => team.name === teamName)?.id;
      if (!teamId) throw new Error("팀을 찾을 수 없습니다.");
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
      void queryClient.invalidateQueries({ queryKey: ["home-posts"] });
      queryClient.setQueryData(["team-activity", post.id], post);
      navigation.goBack();
    },

    onError: () => {
      Alert.alert(isEditing ? "저장하지 못했어요" : "등록하지 못했어요", "잠시 후 다시 시도해주세요.");
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
            options={teamNames}
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
              label={isEditing ? "저장하기" : "등록하기"}
              onPress={handleSubmitPress}
              disabled={!canSubmit}
              loading={isPending}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
