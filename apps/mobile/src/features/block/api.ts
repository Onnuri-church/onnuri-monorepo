import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BlockedUser } from "@onnuri/shared";

import { apiClient } from "../../shared/api/client";
import { useAuthStore } from "../../shared/store/useAuthStore";

export const BLOCKS_KEY = ["blocks"];

// 내 차단 목록 (SCRUM-198). 설정 > 차단 목록과, 채팅에서 차단한 사람의 메시지를 접는 데 쓴다.
// 글·댓글은 서버가 이미 빼서 내려주므로 앱이 거를 필요가 없다.
export function useBlockedUsers() {
  const loggedIn = useAuthStore((state) => state.session.status === "authenticated");
  return useQuery({
    queryKey: BLOCKS_KEY,
    queryFn: () => apiClient.get<BlockedUser[]>("/users/me/blocks").then((res) => res.data),
    enabled: loggedIn,
    staleTime: 5 * 60 * 1000,
  });
}

// 차단한 사람 id 모음 — 채팅 메시지를 접을지 판단할 때.
export function useBlockedUserIds(): Set<string> {
  const { data } = useBlockedUsers();
  return new Set((data ?? []).map((user) => user.userId));
}

// 차단·해제 뒤에는 캐시를 통째로 다시 받는다 — 글·댓글 목록이 화면마다 흩어져 있어
// 어느 목록에 그 사람이 있었는지 골라 지우는 것보다 단순하고 확실하다.
export function useBlockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => apiClient.post("/users/me/blocks", { userId }),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => apiClient.delete(`/users/me/blocks/${userId}`),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
