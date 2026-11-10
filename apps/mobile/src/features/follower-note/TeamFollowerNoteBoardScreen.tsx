import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Text } from "react-native";

import type { RootStackParamList } from "../../shared/types/navigation";
import { toTimeAgo } from "../../shared/utils/date";
import { useMe } from "../profile/useMe";
import { useTeam } from "../team-story/api";
import { FollowerNoteBoardView } from "./FollowerNoteBoardView";
import {
  useAddTeamFollowerNoteComment,
  useDeleteTeamFollowerNote,
  useDeleteTeamFollowerNoteComment,
  useTeamFollowerNotes,
  useUpdateTeamFollowerNoteComment,
} from "./teamApi";

// 팀 팔로워 노트 게시판 (SCRUM-180) — 팀장들이 함께 쓰는 팀원 케어 기록. 들어오는 길은 팀 스토리 상세의
// "팀 팔로워 노트"(팀장에게만)와 팀장 마이페이지. 화면은 셀 노트와 같고 내용(본문 하나)만 다르다.
// 작성·수정·삭제는 그 팀 현재 팀장 누구나 — 관리자는 열람과 댓글(목사님 댓글)만.
export function TeamFollowerNoteBoardScreen() {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<RootStackParamList, "TeamFollowerNoteBoard">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { teamId, noteId } = route.params;
  const team = useTeam(teamId);
  const me = useMe();
  const isTeamLeader = (me?.teams ?? []).some((item) => item.id === teamId && item.role === "LEADER");
  const { data: notes, isLoading, refetch, isRefetching } = useTeamFollowerNotes(teamId);

  return (
    <FollowerNoteBoardView
      caption={team?.name ?? ""}
      notes={notes}
      isLoading={isLoading}
      isRefetching={isRefetching}
      onRefresh={() => void refetch()}
      targetNoteId={noteId}
      canWrite={isTeamLeader}
      onWritePress={() => navigation.navigate("TeamFollowerNoteWrite", { teamId })}
      onEditNote={(id) => navigation.navigate("TeamFollowerNoteWrite", { teamId, noteId: id })}
      deleteNote={useDeleteTeamFollowerNote(teamId)}
      addComment={useAddTeamFollowerNoteComment(teamId)}
      updateComment={useUpdateTeamFollowerNoteComment(teamId)}
      deleteComment={useDeleteTeamFollowerNoteComment(teamId)}
      renderContent={(note) => ({
        title: note.dateLabel,
        // 다른 팀장이 고쳤으면 누가 마지막으로 고쳤는지 같이 보여준다 (한 노트를 함께 편집).
        authorLine: note.editedByName
          ? t("{{name}} 작성 · {{editor}} 수정", { name: note.authorName, editor: note.editedByName })
          : t("{{name}} 작성", { name: note.authorName }),
        avatarUrl: note.authorAvatarUrl,
        timeLabel: toTimeAgo(note.createdAt),
        body: <Text className="text-body-medium text-text-neutral">{note.content}</Text>,
      })}
    />
  );
}
