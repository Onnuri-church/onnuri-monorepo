import type {
  AddChatRoomMembersRequest,
  CreateChatRoomRequest,
  LeaderRoomCandidate,
  LeaderRoomDetail,
  LeaderRoomSummary,
  UpdateChatRoomRequest,
} from "@onnuri/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "../../shared/api/client";

// 전체 리더 방 목록 — 마이페이지 입구의 빨간 점이 안 읽은 수를 쓴다. 푸시를 받아도 앱이 바로 알 수
// 없어서(다른 단톡방 표시와 같이) 짧은 주기로 다시 확인한다.
export function useLeaderRooms(enabled: boolean) {
  return useQuery({
    queryKey: ["leader-rooms"],
    queryFn: () => apiClient.get<LeaderRoomSummary[]>("/leader-rooms").then((res) => res.data),
    enabled,
    refetchInterval: 15000,
  });
}

export function useLeaderRoomDetail(roomId: string | undefined) {
  return useQuery({
    queryKey: ["leader-room", roomId],
    queryFn: () =>
      apiClient.get<LeaderRoomDetail>(`/leader-rooms/${roomId}`).then((res) => res.data),
    enabled: Boolean(roomId),
  });
}

// 방에 넣을 수 있는 사람(리더 등급 전체) — 방 만들기·멤버 추가 화면의 선택지. 관리자만 받는다.
export function useLeaderRoomCandidates(enabled: boolean) {
  return useQuery({
    queryKey: ["leader-room-candidates"],
    queryFn: () =>
      apiClient.get<LeaderRoomCandidate[]>("/leader-rooms/candidates").then((res) => res.data),
    enabled,
  });
}

function useRoomsMutation<TInput, TOutput>(mutationFn: (input: TInput) => Promise<TOutput>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["leader-rooms"] });
      void queryClient.invalidateQueries({ queryKey: ["leader-room"] });
    },
  });
}

export function useCreateLeaderRoom() {
  return useRoomsMutation((body: CreateChatRoomRequest) =>
    apiClient.post<LeaderRoomDetail>("/leader-rooms", body).then((res) => res.data),
  );
}

export function useRenameLeaderRoom(roomId: string) {
  return useRoomsMutation((body: UpdateChatRoomRequest) =>
    apiClient.patch<LeaderRoomDetail>(`/leader-rooms/${roomId}`, body).then((res) => res.data),
  );
}

export function useAddLeaderRoomMembers(roomId: string) {
  return useRoomsMutation((body: AddChatRoomMembersRequest) =>
    apiClient
      .post<LeaderRoomDetail>(`/leader-rooms/${roomId}/members`, body)
      .then((res) => res.data),
  );
}

export function useRemoveLeaderRoomMember(roomId: string) {
  return useRoomsMutation((memberId: string) =>
    apiClient
      .delete<LeaderRoomDetail>(`/leader-rooms/${roomId}/members/${memberId}`)
      .then((res) => res.data),
  );
}

export function useDeleteLeaderRoom(roomId: string) {
  return useRoomsMutation(() => apiClient.delete(`/leader-rooms/${roomId}`));
}
