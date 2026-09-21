import type { AdminMemberRole, Gender } from "@onnuri/shared";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { useLayoutEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";

import { Header } from "../../shared/components/base/Header";
import { TextField } from "../../shared/components/base/TextField";
import { DateField } from "../../shared/components/composed/DateField";
import { SelectField } from "../../shared/components/composed/SelectField";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useCells } from "../cell/api";
import { fetchTeams } from "../profile/api";
import { useAdminMember, useUpdateAdminMember } from "./api";

// 권한 선택지 — 시안 액션시트에는 "관리자"도 있지만 앱 지정 대상에서 제외 (2026-09-21 확정).
const ROLE_OPTIONS: { label: string; value: AdminMemberRole }[] = [
  { label: "일반사용자", value: "GENERAL" },
  { label: "팀장", value: "TEAM_LEADER" },
  { label: "팔로워", value: "CELL_LEADER" },
];
const NO_MEMBERSHIP = "소속 없음";

// 회원 편집 (회원 상세 헤더 "편집" — 2026-09-21 시안). 시안은 카드 안 행별 편집(인라인
// 연필·휠 피커·액션시트)인데, 앱의 기존 폼 관례(TextField/DateField/SelectField 스택)로
// 근사해 구현했다 — 행별 UI가 필요하면 디자이너와 확인 후 조정.
export function AdminMemberEditScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "AdminMemberEdit">>();
  const { memberId } = route.params;

  // 상세 화면을 거쳐 들어오므로 캐시가 있어 첫 렌더에 프리필이 잡힌다.
  const { data: member } = useAdminMember(memberId);
  const { data: cells } = useCells();
  const { data: teams } = useQuery({ queryKey: ["teams"], queryFn: fetchTeams });
  const updateMember = useUpdateAdminMember(memberId);

  const [name, setName] = useState(member?.name ?? "");
  const [birthDate, setBirthDate] = useState<string | null>(member?.birthDate ?? null);
  const [gender, setGender] = useState<Gender | null>(member?.gender ?? null);
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [cellName, setCellName] = useState<string | null>(member?.cell?.name ?? NO_MEMBERSHIP);
  const [teamName, setTeamName] = useState<string | null>(member?.team?.name ?? NO_MEMBERSHIP);
  const [roleLabel, setRoleLabel] = useState<string | null>(
    ROLE_OPTIONS.find((option) => option.value === member?.role)?.label ?? null,
  );

  const canSubmit = name.trim() !== "" && !updateMember.isPending;

  const handleSavePress = () => {
    if (!canSubmit) return;
    updateMember.mutate(
      {
        name: name.trim(),
        ...(birthDate !== null && { birthDate }),
        ...(gender !== null && { gender }),
        ...(phone.trim() !== "" && { phone: phone.trim() }),
        cellId: (cells ?? []).find((cell) => cell.name === cellName)?.id ?? null,
        teamId: (teams ?? []).find((team) => team.name === teamName)?.id ?? null,
        ...(roleLabel !== null && {
          role: ROLE_OPTIONS.find((option) => option.label === roleLabel)?.value,
        }),
      },
      {
        onSuccess: () => navigation.goBack(),
        onError: (error) => {
          // 서버 검증 메시지(팀 없이 팀장 지정 등)를 그대로 보여준다.
          const message =
            (error as { response?: { data?: { message?: string } } }).response?.data?.message;
          Alert.alert("저장 실패", message ?? "잠시 후 다시 시도해주세요.");
        },
      },
    );
  };

  // 저장 버튼이 화면 상태에 의존하므로 화면이 헤더를 단독 등록한다 (시안: 헤더 우측 "저장").
  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <Header
          variant="sub"
          title="회원 정보"
          rightAction="text"
          rightLabel="저장"
          onPressRightLabel={handleSavePress}
        />
      ),
    });
  });

  if (!member) {
    return (
      <View className="flex-1 items-center justify-center bg-background-normal">
        <Text className="text-body-regular text-text-alternative">
          회원 정보를 불러오고 있어요.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-normal">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerClassName="gap-2 px-5 pb-10 pt-4" keyboardShouldPersistTaps="handled">
          <TextField label="이름" placeholder="이름을 입력하세요." value={name} onChangeText={setName} />

          <DateField
            label="생년월일"
            placeholder="생년월일을 선택하세요."
            value={birthDate}
            onChange={setBirthDate}
          />

          {/* 성별 — 시안: 남성/여성 토글 */}
          <View className="py-4">
            <Text className="text-body-main text-text-normal">성별</Text>
            <View className="mt-2 flex-row self-start overflow-hidden rounded-lg bg-background-muted">
              {(["MALE", "FEMALE"] as const).map((value) => (
                <Pressable
                  key={value}
                  className={`h-8 w-14 items-center justify-center ${
                    gender === value ? "rounded-lg bg-primary-normal" : ""
                  }`}
                  onPress={() => setGender(value)}
                >
                  <Text
                    className={
                      gender === value
                        ? "text-caption-main text-text-disable"
                        : "text-caption-main text-text-alternative"
                    }
                  >
                    {value === "MALE" ? "남성" : "여성"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <TextField
            label="연락처"
            placeholder="연락처를 입력하세요."
            value={phone}
            onChangeText={setPhone}
          />

          <SelectField
            label="소속 셀"
            placeholder="소속 셀을 선택하세요."
            options={[NO_MEMBERSHIP, ...(cells ?? []).map((cell) => cell.name)]}
            value={cellName}
            onChange={setCellName}
          />

          <SelectField
            label="소속 팀"
            placeholder="소속 팀을 선택하세요."
            options={[NO_MEMBERSHIP, ...(teams ?? []).map((team) => team.name)]}
            value={teamName}
            onChange={setTeamName}
          />

          <SelectField
            label="권한"
            placeholder="권한을 선택하세요."
            options={ROLE_OPTIONS.map((option) => option.label)}
            value={roleLabel}
            onChange={setRoleLabel}
          />

          {/* 가입일 — 수정 불가 (시안) */}
          <View className="flex-row items-center justify-between py-4">
            <Text className="text-body-main text-text-normal">가입일</Text>
            <Text className="text-body-regular text-text-alternative">{member.joinedAtLabel}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
