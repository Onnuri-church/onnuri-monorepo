import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "../../shared/components/base/Button";
import { Icon } from "../../shared/components/base/Icon";
import { ImageSlot } from "../../shared/components/base/ImageSlot";
import { TextAreaField } from "../../shared/components/base/TextAreaField";
import { TextField } from "../../shared/components/base/TextField";
import { DateField } from "../../shared/components/composed/DateField";
import { SelectField } from "../../shared/components/composed/SelectField";
import { uploadImage } from "../../shared/api/upload";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useAdminMembers } from "../admin/api";
import { buildMemberOptions, findOptionByLabel } from "../admin/memberOptions";
import { fetchGroupMeetingDetail, useCreateGroupMeeting, useUpdateGroupMeeting } from "./api";

interface LeaderPick {
  id: string;
  name: string;
}

// 취향소그룹 생성/편집 겸용 폼 (관리자 전용 — 2026-09-21 시안: 배경사진/이름/설명문/
// 모집일/장소/비용/소그룹장 한 명 이상). meetingId가 있으면 편집 모드로 기존 값을 채운다.
export function GroupMeetingFormScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "GroupMeetingForm">>();
  const meetingId = route.params?.meetingId;

  // 편집 프리필 — 목록을 거쳐 들어오므로 상세가 캐시에 있으면 즉시, 없으면 받아서 채운다.
  const { data: editing } = useQuery({
    queryKey: ["group-meetings", meetingId],
    queryFn: () => fetchGroupMeetingDetail(meetingId!),
    enabled: meetingId !== undefined,
  });

  const { data: members } = useAdminMembers();
  const createMeeting = useCreateGroupMeeting();
  const updateMeeting = useUpdateGroupMeeting(meetingId ?? "");
  const saving = createMeeting.isPending || updateMeeting.isPending;

  // 기존 저장 주소(http) 또는 새로 고른 로컬 사진(file://) — 저장 때 로컬만 업로드된다.
  const [coverUri, setCoverUri] = useState<string | null>(editing?.thumbnailUrl ?? null);
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [recruitStart, setRecruitStart] = useState<string | null>(editing?.recruitStart ?? null);
  const [recruitEnd, setRecruitEnd] = useState<string | null>(editing?.deadline ?? null);
  const [place, setPlace] = useState(editing?.place === "미정" ? "" : (editing?.place ?? ""));
  const [cost, setCost] = useState(editing?.cost === "미정" ? "" : (editing?.cost ?? ""));
  const [leaders, setLeaders] = useState<LeaderPick[]>(editing?.leaders ?? []);

  const canSubmit =
    !saving &&
    title.trim() !== "" &&
    description.trim() !== "" &&
    recruitStart !== null &&
    recruitEnd !== null &&
    place.trim() !== "" &&
    cost.trim() !== "" &&
    leaders.length > 0;

  const handleCoverUploadPress = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled) return;
    setCoverUri(result.assets[0].uri);
  };

  // 소그룹장 추가 — SelectField를 "추가" 트리거로 쓴다 (고르면 목록에 붙고 선택값은 비운다).
  // 동명이인 구별: "이름 (소속)" 라벨로 고르고 id로 다룬다 (admin/memberOptions.ts).
  const memberOptions = buildMemberOptions(members);
  const handleLeaderAdd = (label: string) => {
    const option = findOptionByLabel(memberOptions, label);
    const member = (members ?? []).find((item) => item.id === option?.id);
    if (!member || leaders.some((leader) => leader.id === member.id)) return;
    setLeaders((prev) => [...prev, { id: member.id, name: member.name }]);
  };

  const handleSubmitPress = async () => {
    if (!recruitStart || !recruitEnd) return;

    let coverImageUrl: string | null = null;
    try {
      coverImageUrl = coverUri ? await uploadImage(coverUri) : null;
    } catch {
      Alert.alert("사진 업로드 실패", "잠시 후 다시 시도해주세요.");
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      recruitStart,
      recruitEnd,
      place: place.trim(),
      cost: cost.trim(),
      leaderIds: leaders.map((leader) => leader.id),
      coverImageUrl,
    };
    const mutation = meetingId ? updateMeeting : createMeeting;
    mutation.mutate(payload, {
      onSuccess: () => navigation.goBack(),
      onError: (error) => {
        const message =
          (error as { response?: { data?: { message?: string } } }).response?.data?.message;
        Alert.alert("저장 실패", message ?? "잠시 후 다시 시도해주세요.");
      },
    });
  };

  return (
    <View className="flex-1 bg-background-normal">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerClassName="gap-4 px-5 pb-6 pt-4" keyboardShouldPersistTaps="handled">
          {/* 배경사진 — 시안: 362x173 점선 슬롯 */}
          <View className="py-3">
            <Text className="text-body-main text-text-normal">배경사진</Text>
            <View className="mt-4 h-43">
              <ImageSlot
                imageUri={coverUri}
                outline
                onUploadPress={handleCoverUploadPress}
                onDeletePress={() => setCoverUri(null)}
              />
            </View>
          </View>

          <TextField
            label="취향소그룹 이름"
            placeholder="소그룹 이름을 입력하세요."
            value={title}
            onChangeText={setTitle}
          />

          <View>
            <TextAreaField
              label="설명문"
              placeholder="소그룹을 소개하는 글을 입력하세요."
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {/* 모집일 — 시안은 기간 한 줄인데 기간 피커가 없어 시작/마감 두 줄로 근사 */}
          <DateField
            label="모집 시작일"
            placeholder="모집 시작일을 선택하세요."
            value={recruitStart}
            onChange={setRecruitStart}
          />
          <DateField
            label="모집 마감일"
            placeholder="모집 마감일을 선택하세요."
            value={recruitEnd}
            onChange={setRecruitEnd}
          />

          <TextField label="장소" placeholder="모임 장소를 입력하세요." value={place} onChangeText={setPlace} />
          <TextField label="비용" placeholder="1인당 비용을 입력하세요." value={cost} onChangeText={setCost} />

          {/* 소그룹장 — 한 명 이상, 다중 가능 (2026-09-21 확정). 행의 X로 빼고 아래에서 추가한다. */}
          <View className="py-3">
            <View className="flex-row items-center gap-2">
              <Text className="text-body-main text-text-normal">소그룹장</Text>
              <Text className="text-caption-main text-text-alternative">한 명 이상</Text>
            </View>
            <View className="mt-2">
              {leaders.map((leader) => (
                <View
                  key={leader.id}
                  className="flex-row items-center justify-between border-b border-background-assistive py-2.5"
                >
                  <Text className="text-body-main text-text-normal">{leader.name}</Text>
                  <Pressable
                    onPress={() =>
                      setLeaders((prev) => prev.filter((item) => item.id !== leader.id))
                    }
                    hitSlop={8}
                  >
                    <Icon name="close-square" size={18} color={colors.icon.normal} />
                  </Pressable>
                </View>
              ))}
            </View>
            <View className="-mt-2">
              <SelectField
                label=""
                placeholder="소그룹장 추가"
                options={memberOptions
                  .filter((option) => !leaders.some((leader) => leader.id === option.id))
                  .map((option) => option.label)}
                value={null}
                onChange={handleLeaderAdd}
              />
            </View>
          </View>

          <View className="mt-4">
            <Button
              label={meetingId ? "저장하기" : "등록하기"}
              disabled={!canSubmit}
              onPress={handleSubmitPress}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
