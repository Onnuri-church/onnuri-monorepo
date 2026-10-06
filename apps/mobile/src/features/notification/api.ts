import type { NotificationInfo } from "@onnuri/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "../../shared/api/client";

// 알림센터 목록 — 최신순 최근 100건 (서버 계약 참고).
export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiClient.get<NotificationInfo[]>("/notifications").then((res) => res.data),
  });
}

// 전체 읽음 처리 — 알림센터를 열면 부른다. 캐시는 건드리지 않는다:
// 보고 있는 동안은 안읽음 강조가 유지되고, 다음에 목록을 다시 불러오면 읽음으로 온다.
export function useMarkAllNotificationsRead() {
  return useMutation({
    mutationFn: () => apiClient.post("/notifications/read-all").then((res) => res.data),
  });
}

// 개별 지우기 — 행 왼쪽 스와이프. 서버 응답을 기다리지 않고 캐시에서 먼저 뺀다
// (큐티 좋아요와 같은 이유 — 밀었는데 행이 남아 있으면 안 지워진 것처럼 보인다).
export function useRemoveNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/notifications/${id}`).then((res) => res.data),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previous = queryClient.getQueryData<NotificationInfo[]>(["notifications"]);
      queryClient.setQueryData<NotificationInfo[]>(
        ["notifications"],
        (old) => old?.filter((item) => item.id !== id) ?? old,
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      queryClient.setQueryData(["notifications"], context?.previous);
    },
  });
}

// 전체 지우기 — 알림센터 헤더의 "모두 지우기".
export function useRemoveAllNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.delete("/notifications").then((res) => res.data),
    onSuccess: () => {
      queryClient.setQueryData<NotificationInfo[]>(["notifications"], []);
      void queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
  });
}
