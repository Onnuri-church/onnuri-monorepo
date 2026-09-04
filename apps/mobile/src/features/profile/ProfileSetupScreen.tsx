import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { User } from "@onnuri/shared";

import { Button } from "../../shared/components/base/Button";
import { useAuthStore } from "../../shared/store/useAuthStore";
import { colors } from "../../shared/theme/tokens";
import { SelectField } from "../../shared/components/composed/SelectField";

// 프로필 등록 API가 아직 없어서(백엔드 미구현) 등록하기는 서버로 보내지 않고 임시 세션으로 들어간다.
// 로그인 → 프로필 설정 → 홈까지 눌러서 확인하기 위한 임시 배선이다 — 실제 연동 시 통째로 지운다.
const DEV_USER: User = {
  id: "dev-user",
  name: "개발용 계정",
  cellName: null,
  teamId: null,
  role: "member",
  birthDate: null,
  gender: null,
  phone: null,
  avatarUrl: null,
  intro: null,
  isAdmin: false,
  createdAt: "2026-01-01T00:00:00.000Z",
};

// 소속이 없는 경우를 고를 수 있어야 해서 양쪽 다 "없음"이 첫 항목이다.
const CELLS = [
  "없음",
  "범준셀",
  "상현셀",
  "수빈셀",
  "영우셀",
  "예은셀",
  "지수셀",
  "지연셀",
  "지환셀",
  "준영셀",
  "현호셀",
  "혜민셀",
  "효원셀",
];
const TEAMS = [
  "없음",
  "디자인팀",
  "방송팀",
  "영상팀",
  "중보기도팀",
  "찬양팀",
  "풋살팀",
  "SNS팀"
];

const GENDERS = ["남성", "여성"];

export function ProfileSetupScreen() {
  const setSession = useAuthStore((state) => state.setSession);
  const insets = useSafeAreaInsets();

  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [cell, setCell] = useState<string | null>(null);
  const [team, setTeam] = useState<string | null>(null);

  // 네 항목을 다 채우기 전까지는 등록하기가 비활성이다 (시안에 비활성 상태가 있다).
  const canSubmit = birthday.length === 6 && gender !== null && cell !== null && team !== null;

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
            <Text className="text-body-main text-text-normal">성별</Text>
            {/* 시안에 둘 다 안 고른 상태가 없어서, 처음에는 둘 다 미선택(회색) 스타일이다.
                테두리는 시안이 0.5px이지만 기본 스케일에 없어서 1px(border)로 넣었다. */}
            <View className="mt-5 flex-row gap-2">
              {GENDERS.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setGender(option)}
                  style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
                  className={
                    gender === option
                      ? "h-11 flex-1 items-center justify-center rounded-2xl border border-primary-normal bg-background-alternative"
                      : "h-11 flex-1 items-center justify-center rounded-2xl border border-text-alternative bg-background-muted"
                  }
                >
                  <Text
                    className={
                      gender === option
                        ? "text-body-main text-primary-normal"
                        : "text-body-main text-text-alternative"
                    }
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <SelectField
            label="소속 셀"
            placeholder="나의 셀을 선택하세요."
            options={CELLS}
            value={cell}
            onChange={setCell}
          />

          <SelectField
            label="소속 팀"
            placeholder="나의 팀을 선택하세요."
            options={TEAMS}
            value={team}
            onChange={setTeam}
          />
        </ScrollView>

        <View className="px-5 pb-12">
          <Button
            label="등록하기"
            disabled={!canSubmit}
            onPress={() => setSession(DEV_USER, "dev")}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
