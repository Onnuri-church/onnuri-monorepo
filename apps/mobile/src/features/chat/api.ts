import type {
  ChatMediaItem,
  SetChatMuteRequest,
  AddChatPollOptionRequest,
  ChatPollCommentInfo,
  ChatPollInfo,
  CreateChatPollCommentRequest,
  ChatMessageInfo,
  ChatRoomResponse,
  SendChatMessageRequest,
  SetChatNoticeRequest,
  ToggleChatReactionRequest,
  VoteChatPollRequest,
} from "@onnuri/shared";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { apiClient } from "../../shared/api/client";

// 팀 단톡방(room)·셀 단톡방(cell)·소그룹(group)·전체 리더 방(leader)은 주소만 다르고 요청·응답이 같다.
export type ChatKind = "room" | "cell" | "group" | "leader";

const CHAT_POLL_MS = 4000;

function roomPath(kind: ChatKind, id: string): string {
  if (kind === "room") return `/chat-rooms/${id}/messages`;
  if (kind === "group") return `/group-meetings/${id}/messages`;
  if (kind === "leader") return `/leader-rooms/${id}/messages`;
  return `/cells/${id}/messages`;
}

function readPath(kind: ChatKind, id: string): string {
  if (kind === "room") return `/chat-rooms/${id}/read`;
  if (kind === "group") return `/group-meetings/${id}/read`;
  if (kind === "leader") return `/leader-rooms/${id}/read`;
  return `/cells/${id}/read`;
}

// 방을 읽었다고 서버에 알린다 — 방을 열었을 때와, 열어 둔 채 새 메시지가 왔을 때.
export function markChatRead(kind: ChatKind, id: string): Promise<unknown> {
  return apiClient.put(readPath(kind, id));
}

// 셀·소그룹 방의 안 읽은 메시지 수 — 셀 페이지 헤더 아이콘의 빨간 점이 쓴다.
// 푸시를 받아도 앱이 바로 알 수 없어서 짧은 주기로 다시 확인한다.
export function useChatUnread(kind: "cell" | "group", id: string, enabled: boolean) {
  return useQuery({
    queryKey: ["chat-unread", kind, id],
    queryFn: () =>
      apiClient
        .get<{ count: number }>(
          kind === "cell" ? `/cells/${id}/unread` : `/group-meetings/${id}/unread`,
        )
        .then((res) => res.data.count),
    enabled: enabled && id !== "",
    refetchInterval: 15000,
  });
}

const fetchChatRoom = (kind: ChatKind, id: string) =>
  apiClient.get<ChatRoomResponse>(roomPath(kind, id)).then((res) => res.data);

// 방에 들어가기 전에 대화를 미리 받아 둔다 (SCRUM-225) — 목록·셀 페이지가 보이는 동안 받아 두면
// 방을 누르는 순간 캐시로 바로 그리고, 들어간 뒤에는 평소처럼 몇 초마다 새로 받는다.
// 읽음 처리는 하지 않아서 안 읽은 표시에는 영향이 없다. 최근에 대화가 오간 방 몇 개만 받는다.
const PREFETCH_LIMIT = 5;
export function usePrefetchChatRooms(kind: ChatKind, ids: string[]) {
  const queryClient = useQueryClient();
  const key = ids.slice(0, PREFETCH_LIMIT).join(",");
  useEffect(() => {
    if (key === "") return;
    for (const id of key.split(",")) {
      void queryClient.prefetchQuery({
        queryKey: ["chat", kind, id],
        queryFn: () => fetchChatRoom(kind, id),
      });
    }
  }, [queryClient, kind, key]);
}

// 실시간 연결 없이 화면이 열려 있는 동안 몇 초마다 새로 받는다 (푸시 알림은 따로 간다).
export function useChatRoom(kind: ChatKind, id: string, polling: boolean) {
  return useQuery({
    queryKey: ["chat", kind, id],
    queryFn: () => fetchChatRoom(kind, id),
    refetchInterval: polling ? CHAT_POLL_MS : false,
    enabled: id !== "",
  });
}

function useRoomMutation<TInput>(
  kind: ChatKind,
  id: string,
  mutationFn: (input: TInput) => Promise<unknown>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat", kind, id] }),
  });
}

// 보낸 메시지는 서버 응답으로 바로 목록 끝에 붙인다 — 방 전체를 다시 받을 때까지 기다리지 않는다 (SCRUM-212).
// 공지·읽음 등 나머지 상태는 뒤이어 다시 받아 맞춘다.
// onBeforeAppend: 캐시에 붙이기 직전에 불린다 — 화면이 "보내는 중" 말풍선을 진짜로 바꿀 때 등장 효과를
// 다시 주지 않게 그 id를 미리 등록한다 (SCRUM-215).
export function useSendChatMessage(
  kind: ChatKind,
  id: string,
  onBeforeAppend?: (message: ChatMessageInfo) => void,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SendChatMessageRequest) =>
      apiClient.post<ChatMessageInfo>(roomPath(kind, id), body).then((res) => res.data),
    onSuccess: (message) => {
      onBeforeAppend?.(message);
      queryClient.setQueryData<ChatRoomResponse>(["chat", kind, id], (room) =>
        room && !room.messages.some((item) => item.id === message.id)
          ? { ...room, messages: [...room.messages, message] }
          : room,
      );
      void queryClient.invalidateQueries({ queryKey: ["chat", kind, id] });
    },
  });
}

export function useSetChatNotice(kind: ChatKind, id: string) {
  return useRoomMutation(kind, id, (input: { messageId: string; on: boolean }) =>
    apiClient.put(`${roomPath(kind, id)}/${input.messageId}/notice`, {
      on: input.on,
    } satisfies SetChatNoticeRequest),
  );
}

export function useToggleChatReaction(kind: ChatKind, id: string) {
  return useRoomMutation(kind, id, (input: { messageId: string; emoji: string }) =>
    apiClient.put(`${roomPath(kind, id)}/${input.messageId}/reactions`, {
      emoji: input.emoji,
    } satisfies ToggleChatReactionRequest),
  );
}

// 투표 — 내 선택 전체를 교체 / 항목 추가 / 마감. 방 종류와 무관한 주소를 쓴다.
// 투표는 누르자마자 화면에 반영하고(낙관적 갱신), 서버 저장이 실패하면 되돌린다 (SCRUM-218).
// 누가 투표했는지(voters)는 뒤이어 방을 다시 받아 맞춘다.
export function useVoteChatPoll(kind: ChatKind, id: string) {
  const queryClient = useQueryClient();
  const queryKey = ["chat", kind, id];
  return useMutation({
    mutationFn: (input: { pollId: string; optionIds: string[] }) =>
      apiClient.put(`/chat-polls/${input.pollId}/votes`, {
        optionIds: input.optionIds,
      } satisfies VoteChatPollRequest),
    onMutate: async (input) => {
      // 진행 중인 4초 새로고침이 낙관적 값을 덮어쓰지 않게 멈춘다.
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ChatRoomResponse>(queryKey);
      if (previous) {
        queryClient.setQueryData<ChatRoomResponse>(queryKey, {
          ...previous,
          messages: previous.messages.map((message) => {
            const poll = message.poll;
            if (!poll || poll.id !== input.pollId) return message;
            const hadVote = poll.options.some((option) => option.votedByMe);
            const hasVote = input.optionIds.length > 0;
            return {
              ...message,
              poll: {
                ...poll,
                voterCount: poll.voterCount + (hasVote ? 1 : 0) - (hadVote ? 1 : 0),
                options: poll.options.map((option) => {
                  const on = input.optionIds.includes(option.id);
                  if (on === option.votedByMe) return option;
                  return {
                    ...option,
                    votedByMe: on,
                    count: Math.max(0, option.count + (on ? 1 : -1)),
                  };
                }),
              },
            };
          }),
        });
      }
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useAddChatPollOption(kind: ChatKind, id: string) {
  return useRoomMutation(kind, id, (input: { pollId: string; text: string }) =>
    apiClient.post(`/chat-polls/${input.pollId}/options`, {
      text: input.text,
    } satisfies AddChatPollOptionRequest),
  );
}

export function useCloseChatPoll(kind: ChatKind, id: string) {
  return useRoomMutation(kind, id, (pollId: string) =>
    apiClient.post(`/chat-polls/${pollId}/close`),
  );
}

export function useDeleteChatMessage(kind: ChatKind, id: string) {
  return useRoomMutation(kind, id, (messageId: string) =>
    apiClient.delete(`${roomPath(kind, id)}/${messageId}`),
  );
}

// 서랍(☰) — 이 방에서 오간 사진 (SCRUM-230)
export function useChatMedia(kind: ChatKind, id: string) {
  return useQuery({
    queryKey: ["chat-media", kind, id],
    queryFn: () =>
      apiClient.get<ChatMediaItem[]>(`/chats/${kind}/${id}/media`).then((res) => res.data),
  });
}

// 사진 전체 보기 (SCRUM-233) — 최근 것부터 한 쪽씩, 아래로 내리면 이전 사진을 이어 받는다.
// 다음 쪽은 지금까지 받은 마지막 사진의 시각보다 이전 메시지부터 (서버가 메시지 단위로 끊는다).
export function useChatMediaPages(kind: ChatKind, id: string) {
  return useInfiniteQuery({
    queryKey: ["chat-media-pages", kind, id],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      apiClient
        .get<ChatMediaItem[]>(`/chats/${kind}/${id}/media`, {
          params: pageParam ? { before: pageParam } : undefined,
        })
        .then((res) => res.data),
    getNextPageParam: (lastPage) =>
      lastPage.length > 0 ? lastPage[lastPage.length - 1].createdAt : undefined,
  });
}

// 서랍(☰) — 이 방 알림 끄기·켜기. 누르자마자 바꿔 보여주고 실패하면 되돌린다.
export function useSetChatMute(kind: ChatKind, id: string) {
  const queryClient = useQueryClient();
  const queryKey = ["chat", kind, id];
  return useMutation({
    mutationFn: (muted: boolean) =>
      apiClient.put(`/chats/${kind}/${id}/mute`, { muted } satisfies SetChatMuteRequest),
    onMutate: async (muted) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ChatRoomResponse>(queryKey);
      if (previous) queryClient.setQueryData<ChatRoomResponse>(queryKey, { ...previous, muted });
      return { previous };
    },
    onError: (_error, _muted, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
  });
}

// ---- 투표 상세 화면 + 댓글 (SCRUM-247) ----
// 투표 하나 — 방 캐시에 있는 값을 먼저 쓰고(바로 보임), 서버에서 다시 받아 맞춘다.
// 오래된 투표라 방 캐시에 없어도 서버에서 받아 온다.
export function useChatPoll(kind: ChatKind, id: string, pollId: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["chat-poll", pollId],
    queryFn: () =>
      apiClient
        .get<ChatMessageInfo>(`/chat-polls/${pollId}`)
        .then((res) => res.data.poll as ChatPollInfo),
    initialData: () =>
      queryClient
        .getQueryData<ChatRoomResponse>(["chat", kind, id])
        ?.messages.find((message) => message.poll?.id === pollId)?.poll ?? undefined,
    initialDataUpdatedAt: 0,
    refetchInterval: CHAT_POLL_MS * 2,
  });
}

// 상세 화면에서 하는 투표·항목 추가·마감 — 끝나면 상세와 방 목록을 같이 새로 받는다.
export function useChatPollActions(kind: ChatKind, id: string, pollId: string) {
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["chat-poll", pollId] });
    void queryClient.invalidateQueries({ queryKey: ["chat", kind, id] });
  };
  const vote = useMutation({
    mutationFn: (optionIds: string[]) =>
      apiClient.put(`/chat-polls/${pollId}/votes`, { optionIds } satisfies VoteChatPollRequest),
    onSettled: refresh,
  });
  const addOption = useMutation({
    mutationFn: (text: string) =>
      apiClient.post(`/chat-polls/${pollId}/options`, { text } satisfies AddChatPollOptionRequest),
    onSettled: refresh,
  });
  const close = useMutation({
    mutationFn: () => apiClient.post(`/chat-polls/${pollId}/close`),
    onSettled: refresh,
  });
  return { vote, addOption, close };
}

export function useChatPollComments(pollId: string) {
  return useQuery({
    queryKey: ["chat-poll-comments", pollId],
    queryFn: () =>
      apiClient
        .get<ChatPollCommentInfo[]>(`/chat-polls/${pollId}/comments`)
        .then((res) => res.data),
    refetchInterval: CHAT_POLL_MS * 2,
  });
}

// 댓글 쓰기·지우기 — 서버가 돌려준 목록으로 바로 바꾸고, 카드의 댓글 수도 맞춘다.
export function useChatPollCommentActions(kind: ChatKind, id: string, pollId: string) {
  const queryClient = useQueryClient();
  const key = ["chat-poll-comments", pollId];
  const refreshCounts = () => {
    void queryClient.invalidateQueries({ queryKey: ["chat-poll", pollId] });
    void queryClient.invalidateQueries({ queryKey: ["chat", kind, id] });
  };
  const add = useMutation({
    mutationFn: (content: string) =>
      apiClient
        .post<ChatPollCommentInfo[]>(`/chat-polls/${pollId}/comments`, {
          content,
        } satisfies CreateChatPollCommentRequest)
        .then((res) => res.data),
    onSuccess: (comments) => {
      queryClient.setQueryData(key, comments);
      refreshCounts();
    },
  });
  const remove = useMutation({
    mutationFn: (commentId: string) =>
      apiClient.delete(`/chat-polls/${pollId}/comments/${commentId}`),
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ChatPollCommentInfo[]>(key);
      queryClient.setQueryData<ChatPollCommentInfo[]>(key, (list) =>
        list?.filter((comment) => comment.id !== commentId),
      );
      return { previous };
    },
    onError: (_error, _commentId, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      refreshCounts();
    },
  });
  return { add, remove };
}
