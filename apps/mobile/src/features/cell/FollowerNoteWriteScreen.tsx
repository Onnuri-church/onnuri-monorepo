import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { KeyboardAvoidingView, ScrollView, Text, TextInput, View } from "react-native";

import { Button } from "../../shared/components/base/Button";
import { SelectField } from "../../shared/components/composed/SelectField";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { formatSundayLabel, getSundaysOfMonth } from "./attendance";
import { NoteNumberBadge } from "./components/NoteNumberBadge";
import { NOTE_QUESTIONS } from "./followerNotes";

// 팔로워 노트 작성 (시안: 날짜 선택 + 3문항 박스 + 등록하기).
// 노트는 셀모임 날짜(일요일) 단위 주간 보고로 확정됐는데 시안의 첫 필드 라벨은 "대상셀원"이다 —
// 날짜 기반 결정과 어긋나 보여 라벨을 "셀모임 날짜"로 두고 구현했다. 디자이너 확인 필요.
export function FollowerNoteWriteScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const today = new Date();
  const sundayOptions = getSundaysOfMonth(today.getFullYear(), today.getMonth() + 1).map(
    formatSundayLabel,
  );

  const [selectedSunday, setSelectedSunday] = useState<string | null>(null);
  const [answers, setAnswers] = useState<string[]>(["", "", ""]);

  const handleAnswerChange = (index: number) => (text: string) =>
    setAnswers((prev) => prev.map((answer, i) => (i === index ? text : answer)));

  const handleSubmitPress = () => {
    // TODO(API): 등록 연동 전 — 게시판으로 돌아가기만 한다.
    navigation.goBack();
  };

  return (
    <View className="flex-1 bg-background-normal">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          className="h-full flex-1"
          contentContainerClassName="justify-start gap-8 px-5 pb-20 pt-4"
          keyboardShouldPersistTaps="handled"
        >
          <SelectField
            label="셀모임 날짜"
            placeholder="날짜를 선택하세요."
            options={sundayOptions}
            value={selectedSunday}
            onChange={setSelectedSunday}
          />

          {NOTE_QUESTIONS.map((question, index) => (
            <View key={question.title} className="gap-4">
              <View className="flex-row items-center gap-1">
                <NoteNumberBadge number={index + 1} />
                <Text className="text-body-main text-text-normal">{question.title}</Text>
              </View>
              {/* 시안 확정값: 박스 높이 174(min-h-44로 근사), radius 20 */}
              <TextInput
                className="min-h-44 rounded-5 border border-background-assistive bg-background-normal p-4 text-body-regular text-text-normal"
                value={answers[index]}
                onChangeText={handleAnswerChange(index)}
                placeholder={question.placeholder}
                placeholderTextColor={colors.text.assistive}
                multiline
                textAlignVertical="top"
              />
            </View>
          ))}

          <View className="mt-8">
            <Button
              label="등록하기"
              onPress={handleSubmitPress}
              disabled={selectedSunday === null || answers[0].trim().length === 0}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
