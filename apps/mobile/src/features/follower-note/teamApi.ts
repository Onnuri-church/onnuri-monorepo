import type {
  CreateTeamFollowerNoteRequest,
  TeamFollowerNoteInfo,
  UpdateTeamFollowerNoteRequest,
} from "@onnuri/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "../../shared/api/client";

// 팀 팔로워 노트 (SCRUM-180) — /teams/:id/follower-notes. 쓰기 요청이 전부 갱신된 목록을 응답으로
// 돌려주므로(서버 계약) invalidate 대신 setQueryData로 바로 캐시를 바꾼다 (셀 노트와 같은 방식).
const key = (teamId: string) => ["team-follower-notes", teamId];
const base = (teamId: string) => `/teams/${teamId}/follower-notes`;

export function useTeamFollowerNotes(teamId: string) {
  return useQuery({
    queryKey: key(teamId),
    queryFn: () => apiClient.get<TeamFollowerNoteInfo[]>(base(teamId)).then((res) => res.data),
  });
}

export function useCreateTeamFollowerNote(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTeamFollowerNoteRequest) =>
      apiClient.post<TeamFollowerNoteInfo[]>(base(teamId), payload).then((res) => res.data),
    onSuccess: (notes) => queryClient.setQueryData(key(teamId), notes),
  });
}

// 수정은 화면이 받은 updatedAt을 같이 보낸다 — 그 사이 다른 팀장이 고쳤으면 서버가 409로 거절한다.
export function useUpdateTeamFollowerNote(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, ...body }: UpdateTeamFollowerNoteRequest & { noteId: string }) =>
      apiClient
        .patch<TeamFollowerNoteInfo[]>(`${base(teamId)}/${noteId}`, body)
        .then((res) => res.data),
    onSuccess: (notes) => queryClient.setQueryData(key(teamId), notes),
    // 충돌이면 최신 목록을 다시 받아 둔다 — 화면이 다시 열었을 때 최신 내용으로 고치게.
    onError: () => void queryClient.invalidateQueries({ queryKey: key(teamId) }),
  });
}

export function useDeleteTeamFollowerNote(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) =>
      apiClient.delete<{ id: string }>(`${base(teamId)}/${noteId}`).then((res) => res.data),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: key(teamId) }),
  });
}

export function useAddTeamFollowerNoteComment(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, content, parentId }: { noteId: string; content: string; parentId?: string }) =>
      apiClient
        .post<TeamFollowerNoteInfo[]>(`${base(teamId)}/${noteId}/comments`, { content, parentId })
        .then((res) => res.data),
    onSuccess: (notes) => queryClient.setQueryData(key(teamId), notes),
  });
}

export function useUpdateTeamFollowerNoteComment(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, commentId, content }: { noteId: string; commentId: string; content: string }) =>
      apiClient
        .patch<TeamFollowerNoteInfo[]>(`${base(teamId)}/${noteId}/comments/${commentId}`, { content })
        .then((res) => res.data),
    onSuccess: (notes) => queryClient.setQueryData(key(teamId), notes),
  });
}

export function useDeleteTeamFollowerNoteComment(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, commentId }: { noteId: string; commentId: string }) =>
      apiClient
        .delete<TeamFollowerNoteInfo[]>(`${base(teamId)}/${noteId}/comments/${commentId}`)
        .then((res) => res.data),
    onSuccess: (notes) => queryClient.setQueryData(key(teamId), notes),
  });
}
