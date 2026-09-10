import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { Button } from "../../shared/components/base/Button";
import { ImageSlot } from "../../shared/components/base/ImageSlot";
import { SelectField } from "../../shared/components/composed/SelectField";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { findCell } from "../cell/cells";
import { ADMIN_MEMBERS } from "./adminMock";

// 셀장/부셀장 선택지 — 회원 API가 붙으면 검색 선택으로 바뀔 수 있어 목업 회원 이름을 쓴다.
const MEMBER_NAMES = ADMIN_MEMBERS.map((member) => member.name);

// TODO(시안): 활동기간은 시안 placeholder가 "날짜를 선택하세요."라 데이트 피커일 수 있다 —
//   API 연동 시 확인. 지금은 유통기한 후보를 고정 선택지로 둔다.
const PERIOD_OPTIONS = ["2026.12.31 까지", "2027.02.28 까지", "2027.08.31 까지"];

// 셀 관리의 셀 생성(헤더 "생성")·셀 편집(행 스와이프 연필) 겸용 폼 — 2026-09-10 셀 생성 시안.
// cellId가 있으면 편집 모드로 기존 값을 채워서 연다. 저장은 API 연동 전이라 뒤로가기만 한다.
export function AdminCellFormScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "AdminCellForm">>();
  const editingCell = route.params?.cellId ? findCell(route.params.cellId) : undefined;

  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [name, setName] = useState(editingCell?.name ?? "");
  const [leader, setLeader] = useState<string | null>(editingCell?.leaderName ?? null);
  const [hasViceLeader, setHasViceLeader] = useState(editingCell ? editingCell.viceLeaderName !== null : true);
  const [viceLeader, setViceLeader] = useState<string | null>(editingCell?.viceLeaderName ?? null);

  // 시안의 비활성 등록하기 — 필수(셀이름·셀장·활동기간)를 채워야 활성. 부셀장은 체크 시에만 필수.
  // 편집 모드는 목업에 기간 데이터가 없어 첫 선택지로 채워둔다 (API 연동 시 실제 값으로).
  const [period, setPeriod] = useState<string | null>(editingCell ? PERIOD_OPTIONS[0] : null);
  const canSubmit =
    name.trim() !== "" && leader !== null && period !== null && (!hasViceLeader || viceLeader !== null);

  const handleCoverUploadPress = async () => {
    // 시스템 포토 피커라 별도 권한 요청이 필요 없다 (팀스토리 갤러리와 동일).
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled) return;
    setCoverUri(result.assets[0].uri);
  };

  const handleSubmitPress = () => {
    // TODO(API): 셀 생성/수정 연동 — 목업 단계라 목록으로 돌아가기만 한다.
    navigation.goBack();
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
            options={MEMBER_NAMES}
            value={leader}
            onChange={setLeader}
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
                  options={MEMBER_NAMES.filter((memberName) => memberName !== leader)}
                  value={viceLeader}
                  onChange={setViceLeader}
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

          <SelectField
            label="활동기간"
            placeholder="날짜를 선택하세요."
            options={PERIOD_OPTIONS}
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
