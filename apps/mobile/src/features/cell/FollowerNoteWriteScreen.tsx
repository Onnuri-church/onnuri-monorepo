import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, ScrollView, Text, TextInput, View } from "react-native";

import { Button } from "../../shared/components/base/Button";
import { toDateString } from "../../shared/components/composed/DateField";
import { SelectField } from "../../shared/components/composed/SelectField";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useCreateFollowerNote, useFollowerNotes, useUpdateFollowerNote } from "./api";
import { formatSundayLabel, getSundaysOfMonth } from "./attendance";
import { NoteNumberBadge } from "./components/NoteNumberBadge";
import { NOTE_QUESTIONS } from "./followerNotes";

// 팔로워 노트 작성·수정 겸용 (시안: 날짜 선택 + 3문항 박스 + 등록하기).
// 노트는 셀모임 날짜(일요일) 단위 주간 보고 — 시안 CSS의 "대상셀원" 라벨은 옛 레이어명이고
// "날짜"가 맞다고 2026-09-21 지환님 재확정. 라벨은 "셀모임 날짜" 유지.
// 수정 모드(noteId)는 답변만 고친다 — 날짜는 주간 보고의 정체성이라 서버도 안 받는다.
export function FollowerNoteWriteScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "FollowerNoteWrite">>();
  const { cellId, noteId } = route.params;

  // 게시판을 거쳐 들어오므로 목록 캐시에서 찾는다 (목록 응답이 상세 전체를 담는 계약).
  const { data: notes } = useFollowerNotes(cellId);
  const editing = noteId ? notes?.find((note) => note.id === noteId) : undefined;
  const isEditing = noteId !== undefined;

  const today = new Date();
  const sundays = getSundaysOfMonth(today.getFullYear(), today.getMonth() + 1);
  const sundayOptions = sundays.map(formatSundayLabel);

  const [selectedSunday, setSelectedSunday] = useState<string | null>(null);
  const [answers, setAnswers] = useState<string[]>(editing?.answers ?? ["", "", ""]);

  const createNote = useCreateFollowerNote(cellId);
  const updateNote = useUpdateFollowerNote(cellId);
  const saving = createNote.isPending || updateNote.isPending;

  const handleAnswerChange = (index: number) => (text: string) =>
    setAnswers((prev) => prev.map((answer, i) => (i === index ? text : answer)));

  const handleSubmitPress = () => {
    if (saving) return;
    const onError = (error: unknown) => {
      // 서버 검증 메시지(그 주 노트 중복 등)를 그대로 보여준다.
      const message =
        (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      Alert.alert(isEditing ? "저장 실패" : "등록 실패", message ?? "잠시 후 다시 시도해주세요.");
    };

    if (isEditing && noteId) {
      updateNote.mutate(
        { noteId, answers },
        { onSuccess: () => navigation.goBack(), onError },
      );
      return;
    }

    // 선택지는 라벨 문자열이라 같은 인덱스의 Date에서 요청 날짜를 얻는다.
    const meetingDate = sundays.find((sunday) => formatSundayLabel(sunday) === selectedSunday);
    if (!meetingDate) return;
    createNote.mutate(
      { meetingDate: toDateString(meetingDate), answers },
      { onSuccess: () => navigation.goBack(), onError },
    );
  };

  return (
    <View className="flex-1 bg-background-normal">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          className="h-full flex-1"
          contentContainerClassName="justify-start gap-8 px-5 pb-20 pt-4"
          keyboardShouldPersistTaps="handled"
        >
          {isEditing ? (
            /* 수정 모드 — 날짜는 못 바꾸므로 고정 표시만 한다 */
            <View className="gap-1 py-4">
              <Text className="text-body-main text-text-normal">셀모임 날짜</Text>
              <Text className="px-2 py-3 text-heading-small text-text-alternative">
                {editing ? `${editing.dateLabel} ${editing.meetingLabel}` : ""}
              </Text>
            </View>
          ) : (
            <SelectField
              label="셀모임 날짜"
              placeholder="날짜를 선택하세요."
              options={sundayOptions}
              value={selectedSunday}
              onChange={setSelectedSunday}
            />
          )}

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
              label={isEditing ? "저장하기" : "등록하기"}
              onPress={handleSubmitPress}
              disabled={
                (!isEditing && selectedSunday === null) ||
                answers[0].trim().length === 0 ||
                saving
              }
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
