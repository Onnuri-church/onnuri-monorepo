import type {
  ChatMessageInfo,
  ChatRoomResponse,
  SendChatMessageRequest,
  SetChatNoticeRequest,
  ToggleChatReactionRequest,
} from "@onnuri/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "../../shared/api/client";

// 팀 단톡방(room)과 셀 단톡방(cell)은 주소만 다르고 요청·응답이 같다.
export type ChatKind = "room" | "cell";

const CHAT_POLL_MS = 4000;

function roomPath(kind: ChatKind, id: string): string {
  return kind === "room" ? `/chat-rooms/${id}/messages` : `/cells/${id}/messages`;
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

export function useDeleteChatMessage(kind: ChatKind, id: string) {
  return useRoomMutation(kind, id, (messageId: string) =>
    apiClient.delete(`${roomPath(kind, id)}/${messageId}`),
  );
}
