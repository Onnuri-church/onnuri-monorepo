import type {
  AddChatRoomMembersRequest,
  ChatRoomDetail,
  ChatRoomSummary,
  CreateChatRoomRequest,
  CreateTeamBoardCommentRequest,
  SaveTeamBoardPostRequest,
  TeamBoardListResponse,
  TeamBoardPostDetail,
  TeamBoardPostInfo,
  ToggleTeamBoardReactionRequest,
  UpdateTeamBoardCommentRequest,
  UpdateChatRoomRequest,
} from "@onnuri/shared";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { apiClient } from "../../shared/api/client";

// ---------------------------------------------------------------------
// 팀 전용 게시판 — 그 팀 팀원과 관리자만
// ---------------------------------------------------------------------

// year·month를 안 주면 서버가 이번 달을 고른다 — 화면은 응답의 selectedYear/selectedMonth를 표시한다.
export function useTeamBoard(teamId: string, pick?: { year: number; month: number }) {
  return useInfiniteQuery({
    queryKey: ["team-board", teamId, "list", pick?.year ?? null, pick?.month ?? null],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      apiClient
        .get<TeamBoardListResponse>(`/teams/${teamId}/board`, {
          params: { ...(pageParam ? { cursor: pageParam } : {}), ...(pick ?? {}) },
        })
        .then((res) => res.data),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useTeamBoardPost(teamId: string, postId: string | undefined) {
  return useQuery({
    queryKey: ["team-board", teamId, "post", postId],
    queryFn: () =>
      apiClient
        .get<TeamBoardPostDetail>(`/teams/${teamId}/board/${postId}`)
        .then((res) => res.data),
    enabled: postId !== undefined,
  });
}

function useBoardMutation<TInput>(
  teamId: string,
  mutationFn: (input: TInput) => Promise<unknown>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["team-board", teamId] }),
  });
}

export function useCreateBoardPost(teamId: string) {
  return useBoardMutation(teamId, (body: SaveTeamBoardPostRequest) =>
    apiClient.post<TeamBoardPostInfo>(`/teams/${teamId}/board`, body).then((res) => res.data),
  );
}

export function useUpdateBoardPost(teamId: string, postId: string) {
  return useBoardMutation(teamId, (body: SaveTeamBoardPostRequest) =>
    apiClient
      .patch<TeamBoardPostInfo>(`/teams/${teamId}/board/${postId}`, body)
      .then((res) => res.data),
  );
}

export function useDeleteBoardPost(teamId: string) {
  return useBoardMutation(teamId, (postId: string) =>
    apiClient.delete(`/teams/${teamId}/board/${postId}`),
  );
}

export function useAddBoardComment(teamId: string, postId: string) {
  return useBoardMutation(teamId, (body: CreateTeamBoardCommentRequest) =>
    apiClient.post(`/teams/${teamId}/board/${postId}/comments`, body),
  );
}

export function useUpdateBoardComment(teamId: string, postId: string) {
  return useBoardMutation(teamId, (input: { commentId: string } & UpdateTeamBoardCommentRequest) =>
    apiClient.patch(`/teams/${teamId}/board/${postId}/comments/${input.commentId}`, {
      content: input.content,
    } satisfies UpdateTeamBoardCommentRequest),
  );
}

export function useDeleteBoardComment(teamId: string, postId: string) {
  return useBoardMutation(teamId, (commentId: string) =>
    apiClient.delete(`/teams/${teamId}/board/${postId}/comments/${commentId}`),
  );
}

export function useToggleBoardReaction(teamId: string, postId: string) {
  return useBoardMutation(teamId, (emoji: string) =>
    apiClient.put(`/teams/${teamId}/board/${postId}/reactions`, {
      emoji,
    } satisfies ToggleTeamBoardReactionRequest),
  );
}

// ---------------------------------------------------------------------
// 팀 단톡방 — 팀장·관리자가 만들고 팀원 중 고른 사람만 들어온다
// ---------------------------------------------------------------------

export function useChatRooms(teamId: string) {
  return useQuery({
    queryKey: ["chat-rooms", teamId],
    queryFn: () =>
      apiClient.get<ChatRoomSummary[]>(`/teams/${teamId}/chat-rooms`).then((res) => res.data),
    enabled: teamId !== "",
    // 새 메시지가 오면 안 읽은 표시가 따라오도록 짧은 주기로 다시 확인한다.
    refetchInterval: 15000,
  });
}

// 팀 게시판에 내가 아직 안 연 새 글 수 — 팀 공간·팀 상세 입구의 표시가 쓴다. 글 상세를 열면 읽음 처리된다.
export function useTeamBoardUnread(teamId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["team-board-unread", teamId],
    queryFn: () =>
      apiClient.get<{ count: number }>(`/teams/${teamId}/board/unread`).then((res) => res.data.count),
    enabled: enabled && teamId !== "",
    refetchInterval: 15000,
  });
}

export function useChatRoomDetail(roomId: string | undefined) {
  return useQuery({
    queryKey: ["chat-room", roomId],
    queryFn: () =>
      apiClient.get<ChatRoomDetail>(`/chat-rooms/${roomId}`).then((res) => res.data),
    enabled: roomId !== undefined,
  });
}

function useRoomsMutation<TInput>(mutationFn: (input: TInput) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chat-rooms"] });
      void queryClient.invalidateQueries({ queryKey: ["chat-room"] });
    },
  });
}

export function useCreateChatRoom(teamId: string) {
  return useRoomsMutation((body: CreateChatRoomRequest) =>
    apiClient.post<ChatRoomDetail>(`/teams/${teamId}/chat-rooms`, body).then((res) => res.data),
  );
}

export function useRenameChatRoom(roomId: string) {
  return useRoomsMutation((body: UpdateChatRoomRequest) =>
    apiClient.patch<ChatRoomDetail>(`/chat-rooms/${roomId}`, body).then((res) => res.data),
  );
}

export function useAddChatRoomMembers(roomId: string) {
  return useRoomsMutation((body: AddChatRoomMembersRequest) =>
    apiClient.post<ChatRoomDetail>(`/chat-rooms/${roomId}/members`, body).then((res) => res.data),
  );
}

export function useRemoveChatRoomMember(roomId: string) {
  return useRoomsMutation((memberId: string) =>
    apiClient
      .delete<ChatRoomDetail>(`/chat-rooms/${roomId}/members/${memberId}`)
      .then((res) => res.data),
  );
}

export function useDeleteChatRoom(roomId: string) {
  return useRoomsMutation(() => apiClient.delete(`/chat-rooms/${roomId}`));
}
