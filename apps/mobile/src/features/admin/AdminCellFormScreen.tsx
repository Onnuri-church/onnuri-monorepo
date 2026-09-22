import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { Button } from "../../shared/components/base/Button";
import { ImageSlot } from "../../shared/components/base/ImageSlot";
import { DateField } from "../../shared/components/composed/DateField";
import { SelectField } from "../../shared/components/composed/SelectField";
import { uploadImage } from "../../shared/api/upload";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useCell } from "../cell/api";
import { useAdminMembers, useCreateCell, useUpdateCell } from "./api";

// 셀 관리의 셀 생성(목록 끝 점선 행)·셀 편집(행 스와이프 연필) 겸용 폼 — 2026-09-10 셀 생성 시안.
// cellId가 있으면 편집 모드로 기존 값을 채워서 연다.
export function AdminCellFormScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "AdminCellForm">>();
  // 편집 모드 프리필 — 셀 관리 목록을 거쳐 들어오므로 목록 캐시가 이미 있어 첫 렌더에 값이 잡힌다.
  const editingCell = useCell(route.params?.cellId ?? "");

  // 셀장/부셀장 선택지 — 관리자 전용 회원 목록. SelectField가 문자열만 다뤄서 이름으로
  // 고르고 id로 되돌린다. TODO(동명이인): 이름이 겹치면 먼저 찾은 회원이 잡힌다 —
  // 검색 선택 UI로 바꿀 때 함께 해결.
  const { data: members } = useAdminMembers();
  const memberNames = (members ?? []).map((member) => member.name);
  const findMemberIdByName = (name: string | null) =>
    (members ?? []).find((member) => member.name === name)?.id ?? null;

  // 커버는 기존 저장 주소(http) 또는 새로 고른 로컬 사진(file://)을 한 상태로 들고,
  // 저장할 때 로컬이면 업로드해서 주소로 바꾼다 (uploadImage가 http는 그대로 통과).
  const [coverUri, setCoverUri] = useState<string | null>(editingCell?.coverImageUrl ?? null);
  const [name, setName] = useState(editingCell?.name ?? "");
  const [leaderName, setLeaderName] = useState<string | null>(editingCell?.leaderName ?? null);
  const [hasViceLeader, setHasViceLeader] = useState(editingCell ? editingCell.viceLeaderName !== null : true);
  const [viceLeaderName, setViceLeaderName] = useState<string | null>(editingCell?.viceLeaderName ?? null);

  // 시안의 비활성 등록하기 — 필수(셀이름·셀장·활동기간)를 채워야 활성. 부셀장은 체크 시에만 필수.
  // 활동기간 = 셀 턴 종료일 하나 (2026-09-21 A안 시안: "셀 턴 종료일을 선택하세요"로 확정).
  const [period, setPeriod] = useState<string | null>(editingCell?.expiresAt ?? null);

  const createCell = useCreateCell();
  const updateCell = useUpdateCell(route.params?.cellId ?? "");
  const saving = createCell.isPending || updateCell.isPending;
  const canSubmit =
    !saving &&
    name.trim() !== "" &&
    leaderName !== null &&
    period !== null &&
    (!hasViceLeader || viceLeaderName !== null);

  const handleCoverUploadPress = async () => {
    // 시스템 포토 피커라 별도 권한 요청이 필요 없다 (팀스토리 갤러리와 동일).
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled) return;
    setCoverUri(result.assets[0].uri);
  };

  const handleSubmitPress = async () => {
    const leaderId = findMemberIdByName(leaderName);
    if (!leaderId || !period) return;

    let coverImageUrl: string | null = null;
    try {
      coverImageUrl = coverUri ? await uploadImage(coverUri) : null;
    } catch {
      Alert.alert("사진 업로드 실패", "잠시 후 다시 시도해주세요.");
      return;
    }

    const payload = {
      name: name.trim(),
      leaderId,
      viceLeaderId: hasViceLeader ? findMemberIdByName(viceLeaderName) : null,
      expiresAt: period,
      coverImageUrl,
    };

    const mutation = editingCell ? updateCell : createCell;
    mutation.mutate(payload, {
      onSuccess: () => navigation.goBack(),
      onError: () => Alert.alert("저장 실패", "잠시 후 다시 시도해주세요."),
    });
  };

  return (
    <View className="flex-1 bg-background-normal">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerClassName="gap-4 px-5 pb-6 pt-4"
          keyboardShouldPersistTaps="handled"
        >
          {/* 배경사진 — 시안: 362x173 점선 슬롯, 탭하면 업로드 */}
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

          <SelectField
            label="셀장"
            placeholder="셀장을 선택하세요."
            options={memberNames}
            value={leaderName}
            onChange={setLeaderName}
          />

          {/* 부셀장 — 라벨 옆 체크박스. 해제하면 선택줄이 사라지고 부셀장 없이 생성된다 (시안). */}
          <View className="py-3">
            <View className="flex-row items-center gap-2.5">
              <Text className="text-body-main text-text-normal">부셀장</Text>
              <Pressable
                onPress={() => setHasViceLeader((prev) => !prev)}
                hitSlop={8}
                className={
                  hasViceLeader
                    ? "h-4.5 w-4.5 items-center justify-center rounded bg-primary-normal"
                    : "h-4.5 w-4.5 rounded border border-background-assistive bg-background-normal"
                }
              >
                {hasViceLeader && <Text className="text-caption-small text-text-disable">✓</Text>}
              </Pressable>
            </View>
            {hasViceLeader ? (
              /* SelectField의 라벨 자리는 위의 체크박스 행이 대신하므로 비운다 */
              <View className="-mt-4">
                <SelectField
                  label=""
                  placeholder="부셀장을 선택하세요."
                  options={memberNames.filter((memberName) => memberName !== leaderName)}
                  value={viceLeaderName}
                  onChange={setViceLeaderName}
                />
              </View>
            ) : (
              <Text className="mt-2 text-center text-body-small text-text-alternative">
                체크 해제 시 부셀장 없이 생성돼요
              </Text>
            )}
          </View>

          <View className="py-3">
            <Text className="text-body-main text-text-normal">셀이름</Text>
            <TextInput
              className="mt-1 h-12 border-b border-background-assistive px-2 text-heading-small text-text-normal"
              value={name}
              onChangeText={setName}
              placeholder="셀 이름을 입력하세요."
              placeholderTextColor={colors.text.assistive}
            />
          </View>

          <DateField
            label="활동기간"
            placeholder="셀 턴 종료일을 선택하세요."
            value={period}
            onChange={setPeriod}
          />
        </ScrollView>

        <View className="px-5 pb-12">
          <Button
            label={editingCell ? "저장하기" : "등록하기"}
            disabled={!canSubmit}
            onPress={handleSubmitPress}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
