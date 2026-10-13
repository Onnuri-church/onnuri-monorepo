import type {
  AddChatPollOptionRequest,
  ChatMessageInfo,
  ChatRoomResponse,
  SendChatMessageRequest,
  SetChatNoticeRequest,
  ToggleChatReactionRequest,
  VoteChatPollRequest,
} from "@onnuri/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "../../shared/api/client";

// 팀 단톡방(room)과 셀 단톡방(cell)은 주소만 다르고 요청·응답이 같다.
export type ChatKind = "room" | "cell" | "group";

const CHAT_POLL_MS = 4000;

function roomPath(kind: ChatKind, id: string): string {
  if (kind === "room") return `/chat-rooms/${id}/messages`;
  if (kind === "group") return `/group-meetings/${id}/messages`;
  return `/cells/${id}/messages`;
}

function readPath(kind: ChatKind, id: string): string {
  if (kind === "room") return `/chat-rooms/${id}/read`;
  if (kind === "group") return `/group-meetings/${id}/read`;
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

// 실시간 연결 없이 화면이 열려 있는 동안 몇 초마다 새로 받는다 (푸시 알림은 따로 간다).
export function useChatRoom(kind: ChatKind, id: string, polling: boolean) {
  return useQuery({
    queryKey: ["chat", kind, id],
    queryFn: () => apiClient.get<ChatRoomResponse>(roomPath(kind, id)).then((res) => res.data),
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

export function useSendChatMessage(kind: ChatKind, id: string) {
  return useRoomMutation(kind, id, (body: SendChatMessageRequest) =>
    apiClient.post<ChatMessageInfo>(roomPath(kind, id), body).then((res) => res.data),
  );
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
export function useVoteChatPoll(kind: ChatKind, id: string) {
  return useRoomMutation(kind, id, (input: { pollId: string; optionIds: string[] }) =>
    apiClient.put(`/chat-polls/${input.pollId}/votes`, {
      optionIds: input.optionIds,
    } satisfies VoteChatPollRequest),
  );
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
