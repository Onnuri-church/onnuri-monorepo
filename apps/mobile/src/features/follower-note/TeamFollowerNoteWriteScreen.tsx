import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView, Text, TextInput, View } from "react-native";

import { Button } from "../../shared/components/base/Button";
import { KeyboardAvoidingContainer } from "../../shared/components/base/KeyboardAvoidingContainer";
import { useDiscardGuard, useFormDirty } from "../../shared/hooks/useDiscardGuard";
import { useSubmitLock } from "../../shared/hooks/useSubmitLock";
import { useThemeColors } from "../../shared/theme/useThemeColors";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useCreateTeamFollowerNote, useTeamFollowerNotes, useUpdateTeamFollowerNote } from "./teamApi";

// 셀 노트 한 칸과 같은 상한 — 서버 검증(TEAM_FOLLOWER_NOTE_MAX)과 같다.
const NOTE_MAX_LENGTH = 5000;

// 팀 팔로워 노트 작성·수정 겸용 (SCRUM-180). 셀 노트 작성 화면과 같은 모양이고, 날짜 선택 없이 본문 하나다
// (팀 노트는 모임 단위가 아니라 필요할 때마다 쓴다). 수정은 다른 팀장도 할 수 있어서, 받아 둔 updatedAt을
// 같이 보내 그 사이 누가 먼저 고쳤으면 서버가 거절한다(409) — 그때는 최신 내용을 다시 보라고 안내한다.
export function TeamFollowerNoteWriteScreen() {
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "TeamFollowerNoteWrite">>();
  const { teamId, noteId } = route.params;

  // 게시판을 거쳐 들어오므로 목록 캐시에서 찾는다 (목록 응답이 노트 전체를 담는 계약).
  const { data: notes } = useTeamFollowerNotes(teamId);
  const editing = noteId ? notes?.find((note) => note.id === noteId) : undefined;
  const isEditing = noteId !== undefined;
  const [content, setContent] = useState(editing?.content ?? "");

  const createNote = useCreateTeamFollowerNote(teamId);
  const updateNote = useUpdateTeamFollowerNote(teamId);
  const saving = createNote.isPending || updateNote.isPending;
  const { locked, acquire, release } = useSubmitLock();

  const dirty = useFormDirty({ content });
  const discardDialog = useDiscardGuard({
    dirty,
    submitting: locked,
    mode: isEditing ? "edit" : "write",
  });

  const handleSubmitPress = () => {
    if (saving || !acquire()) return;
    const onError = (error: unknown) => {
      release();
      const response = (error as { response?: { status?: number; data?: { message?: string } } })
        .response;
      if (response?.status === 409) {
        Alert.alert(
          t("다른 팀장이 먼저 수정했어요"),
          t("최신 내용을 확인한 뒤 다시 수정해 주세요."),
          [{ text: t("확인"), onPress: () => navigation.goBack() }],
        );
        return;
      }
      Alert.alert(
        isEditing ? t("저장 실패") : t("등록 실패"),
        response?.data?.message ?? t("잠시 후 다시 시도해주세요."),
      );
    };

    if (isEditing && noteId && editing) {
      updateNote.mutate(
        { noteId, content, updatedAt: editing.updatedAt },
        { onSuccess: () => navigation.goBack(), onError },
      );
      return;
    }
    createNote.mutate({ content }, { onSuccess: () => navigation.goBack(), onError });
  };

  return (
    <View className="flex-1 bg-background-normal">
      <KeyboardAvoidingContainer>
        <ScrollView
          className="h-full flex-1"
          contentContainerClassName="justify-start gap-4 px-5 pb-20 pt-4"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-body-main text-text-normal">{t("팀원 케어 기록")}</Text>
          {/* 셀 노트 문항 박스와 같은 모양 — 본문 하나라 조금 더 높게 둔다. */}
          <TextInput
            className="min-h-72 rounded-5 border border-background-assistive bg-background-normal p-4 text-body-regular text-text-normal"
            value={content}
            onChangeText={setContent}
            placeholder={t("팀원들의 근황, 함께 기도할 부분, 목사님께 나누고 싶은 이야기")}
            placeholderTextColor={themeColors.text.assistive}
            multiline
            maxLength={NOTE_MAX_LENGTH}
            textAlignVertical="top"
          />
          <Text className="text-right text-caption-main text-text-alternative">
            {content.length} / {NOTE_MAX_LENGTH}
          </Text>

          <View className="mt-8">
            <Button
              label={isEditing ? t("저장하기") : t("등록하기")}
              onPress={handleSubmitPress}
              disabled={content.trim().length === 0 || saving}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingContainer>
      {discardDialog}
    </View>
  );
}
