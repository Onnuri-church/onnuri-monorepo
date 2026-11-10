import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import type { RootStackParamList } from "../../shared/types/navigation";
import { toTimeAgo } from "../../shared/utils/date";
import { FollowerNoteBoardView } from "../follower-note/FollowerNoteBoardView";
import { useMe } from "../profile/useMe";
import {
  useAddFollowerNoteComment,
  useCell,
  useDeleteFollowerNote,
  useDeleteFollowerNoteComment,
  useFollowerNotes,
  useUpdateFollowerNoteComment,
} from "./api";
import { canWriteFollowerNote } from "./cellDetail";
import { NoteNumberBadge } from "./components/NoteNumberBadge";
import { getNoteQuestions } from "./followerNotes";

// 셀 팔로워 노트 게시판 (관리 탭 > 팔로워 노트 — 셀장·관리자 전용 경로로만 진입한다).
// 화면 본체는 팀 노트와 공용(FollowerNoteBoardView)이고, 여기서는 셀 노트의 3문항 내용만 그린다.
export function FollowerNoteBoardScreen() {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<RootStackParamList, "FollowerNoteBoard">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { cellId, noteId } = route.params;
  const cell = useCell(cellId);
  // 작성·편집·삭제는 그 셀의 셀장·부셀장만 — 관리자는 열람과 댓글(목사님 댓글)만 (2026-09-10 확정).
  const me = useMe();
  const { data: notes, isLoading, refetch, isRefetching } = useFollowerNotes(cellId);

  return (
    <FollowerNoteBoardView
      caption={cell?.name ?? ""}
      notes={notes}
      isLoading={isLoading}
      isRefetching={isRefetching}
      onRefresh={() => void refetch()}
      targetNoteId={noteId}
      canWrite={canWriteFollowerNote(cellId, me)}
      onWritePress={() => navigation.navigate("FollowerNoteWrite", { cellId })}
      onEditNote={(id) => navigation.navigate("FollowerNoteWrite", { cellId, noteId: id })}
      deleteNote={useDeleteFollowerNote(cellId)}
      addComment={useAddFollowerNoteComment(cellId)}
      updateComment={useUpdateFollowerNoteComment(cellId)}
      deleteComment={useDeleteFollowerNoteComment(cellId)}
      renderContent={(note) => ({
        title: note.dateLabel,
        subtitle: note.meetingLabel,
        authorLine: t("{{name}} 작성", { name: note.authorName }),
        avatarUrl: note.authorAvatarUrl,
        timeLabel: `${note.writtenDateLabel} · ${toTimeAgo(note.createdAt)}`,
        body: getNoteQuestions(note.formVersion).map((question, index) =>
          note.answers[index]?.trim() ? (
            <View key={question.title} className="gap-2.5">
              <View className="flex-row items-center gap-1">
                <NoteNumberBadge number={index + 1} />
                <Text className="text-body-main text-text-normal">{question.title}</Text>
              </View>
              <Text className="text-body-medium text-text-neutral">{note.answers[index]}</Text>
            </View>
          ) : null,
        ),
      })}
    />
  );
}
