import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PHONE_NUMBER_REGEX, type Gender } from "@onnuri/shared";

import { signOut } from "../../shared/api/session";
import { Button } from "../../shared/components/base/Button";
import { useAuthStore } from "../../shared/store/useAuthStore";
import { colors } from "../../shared/theme/tokens";
import { SelectField } from "../../shared/components/composed/SelectField";
import { fetchCells, fetchTeams, patchMyProfile } from "./api";

// 소속이 없는 경우를 고를 수 있어야 해서 셀/팀 다 "없음"이 첫 항목이다.
const NONE_OPTION = "없음";

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "MALE", label: "남성" },
  { value: "FEMALE", label: "여성" },
];

// "000310" → "2000-03-10". 잘못된 입력(자릿수 부족, 2월 31일 등)은 null.
// 두 자리 연도는 올해의 아래 두 자리 이하면 2000년대, 크면 1900년대로 본다.
function parseBirthday(input: string): string | null {
  if (!/^\d{6}$/.test(input)) return null;
  const yy = Number(input.slice(0, 2));
  const mm = Number(input.slice(2, 4));
  const dd = Number(input.slice(4, 6));
  const year = yy <= new Date().getFullYear() % 100 ? 2000 + yy : 1900 + yy;
  // Date는 없는 날짜를 다음 달로 넘겨버리므로(2월 31일 → 3월 2일) 되짚어 확인한다.
  const date = new Date(year, mm - 1, dd);
  if (date.getMonth() !== mm - 1 || date.getDate() !== dd) return null;
  return `${year}-${input.slice(2, 4)}-${input.slice(4, 6)}`;
}

// "2000-03-10" → "000310". 회원 정보 수정(ProfileEdit)에서 저장된 값을 입력칸에 되채울 때 쓴다.
function toBirthdayInput(birthDate: string | null): string {
  return birthDate?.slice(2).replace(/-/g, "") ?? "";
}

// 선택지는 이름 문자열이라(SelectField 계약) 제출할 때 목록에서 id를 되찾는다.
// 셀 이름은 스키마상 유니크가 아니지만 드롭다운 자체가 이름으로만 구분되므로 첫 일치로 충분하다.
function findIdByName(
  list: { id: string; name: string }[] | undefined,
  name: string | null,
): string | null {
  if (!name || name === NONE_OPTION) return null;
  return list?.find((item) => item.name === name)?.id ?? null;
}

// 회원가입 직후(onboarding)의 프로필 설정과 설정 > 회원 정보 수정(ProfileEdit)이 같이 쓴다.
// 저장은 둘 다 PATCH /users/me — 끝나면 onboarding은 setSession으로 메인 트리 전환을 트리거하고,
// 수정 모드는 스토어의 유저만 갈아끼우고 뒤로 돌아간다.
export function ProfileSetupScreen() {
  const session = useAuthStore((state) => state.session);
  const setSession = useAuthStore((state) => state.setSession);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // onboarding/authenticated 밖에서는 이 화면이 마운트되지 않는다 (RootNavigator 분기).
  const sessionUser =
    session.status === "onboarding" || session.status === "authenticated" ? session.user : null;

  const [birthday, setBirthday] = useState(() => toBirthdayInput(sessionUser?.birthDate ?? null));
  const [phone, setPhone] = useState(sessionUser?.phone ?? "");
  const [gender, setGender] = useState<Gender | null>(sessionUser?.gender ?? null);
  // 현재 소속은 유저 응답에 없어서(멤버십 조회 API 없음) 수정 모드에서도 미리 채우지 못한다.
  const [cell, setCell] = useState<string | null>(null);
  const [team, setTeam] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 안드로이드 하드웨어(제스처) 뒤로가기. 온보딩에서는 이 화면이 스택의 유일한 화면이라
  // 기본 동작이 앱을 내려버린다 — 헤더 뒤로가기(RootNavigator 등록부)와 같은 의미로,
  // 온보딩을 중단(signOut)하고 로그인 화면으로 돌아간다. 수정 모드(ProfileEdit)는 기본 pop 유지.
  useEffect(() => {
    if (session.status !== "onboarding") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      void signOut();
      return true;
    });
    return () => subscription.remove();
  }, [session.status]);

  const { data: cells } = useQuery({ queryKey: ["cells"], queryFn: fetchCells });
  const { data: teams } = useQuery({ queryKey: ["teams"], queryFn: fetchTeams });
  const cellOptions = [NONE_OPTION, ...(cells ?? []).map((item) => item.name)];
  const teamOptions = [NONE_OPTION, ...(teams ?? []).map((item) => item.name)];

  // 모든 항목을 채우기 전까지는 등록하기가 비활성이다 (시안에 비활성 상태가 있다).
  const canSubmit =
    parseBirthday(birthday) !== null &&
    PHONE_NUMBER_REGEX.test(phone) &&
    gender !== null &&
    cell !== null &&
    team !== null &&
    !submitting;

  const handleSubmitPress = async () => {
    const birthDate = parseBirthday(birthday);
    if (!birthDate || !gender) return;

    setSubmitting(true);
    try {
      const user = await patchMyProfile({
        birthDate,
        gender,
        phone,
        cellId: findIdByName(cells, cell),
        teamId: findIdByName(teams, team),
      });

      // 저장 중에 세션이 사라졌으면(401 → clearSession) 화면도 곧 로그인으로 바뀐다 — 손대지 않는다.
      const current = useAuthStore.getState().session;
      if (current.status === "onboarding" || current.status === "authenticated") {
        const wasOnboarding = current.status === "onboarding";
        setSession(user, {
          accessToken: current.accessToken,
          refreshToken: current.refreshToken,
        });
        // onboarding이면 setSession이 RootNavigator를 메인 트리로 전환하므로 네비게이션이 필요 없다.
        if (!wasOnboarding) {
          navigation.goBack();
        }
      }
    } catch {
      Alert.alert("프로필 저장에 실패했습니다", "잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-background-normal" style={{ paddingBottom: insets.bottom }}>
      {/* 배경이 흰색이라 상태바 글자·아이콘은 어둡게 */}
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* 시안은 402x874 고정 프레임의 절대 좌표지만 실기기 높이는 제각각이라, 입력 목록이 스크롤되고
            등록하기는 아래에 붙는 구조로 옮겼다 (LoginScreen과 같은 방식). */}
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-7.5 px-5 pb-6"
          keyboardShouldPersistTaps="handled"
        >
          <View className="py-4">
            <Text className="text-body-main text-text-normal">생년월일</Text>
            <TextInput
              className="mt-1 h-12 border-b border-background-assistive px-2 text-heading-small text-text-normal"
              value={birthday}
              onChangeText={setBirthday}
              placeholder="예) 000310 (2000년 3월 10일)"
              placeholderTextColor={colors.text.assistive}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>

          <View className="py-4">
            <Text className="text-body-main text-text-normal">전화번호</Text>
            <TextInput
              className="mt-1 h-12 border-b border-background-assistive px-2 text-heading-small text-text-normal"
              value={phone}
              onChangeText={setPhone}
              placeholder="예) 01012345678"
              placeholderTextColor={colors.text.assistive}
              keyboardType="number-pad"
              maxLength={11}
            />
          </View>

          <View className="py-4">
            <Text className="text-body-main text-text-normal">성별</Text>
            {/* 시안에 둘 다 안 고른 상태가 없어서, 처음에는 둘 다 미선택(회색) 스타일이다.
                테두리는 시안이 0.5px이지만 기본 스케일에 없어서 1px(border)로 넣었다. */}
            <View className="mt-5 flex-row gap-2">
              {GENDER_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => setGender(option.value)}
                  style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
                  className={
                    gender === option.value
                      ? "h-11 flex-1 items-center justify-center rounded-2xl border border-primary-normal bg-background-alternative"
                      : "h-11 flex-1 items-center justify-center rounded-2xl border border-text-alternative bg-background-muted"
                  }
                >
                  <Text
                    className={
                      gender === option.value
                        ? "text-body-main text-primary-normal"
                        : "text-body-main text-text-alternative"
                    }
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <SelectField
            label="소속 셀"
            placeholder="나의 셀을 선택하세요."
            options={cellOptions}
            value={cell}
            onChange={setCell}
          />

          <SelectField
            label="소속 팀"
            placeholder="나의 팀을 선택하세요."
            options={teamOptions}
            value={team}
            onChange={setTeam}
          />
        </ScrollView>

        <View className="px-5 pb-12">
          <Button label="등록하기" disabled={!canSubmit} onPress={() => void handleSubmitPress()} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
