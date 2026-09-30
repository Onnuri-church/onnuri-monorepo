import type { NotificationInfo } from "@onnuri/shared";
import { useMutation, useQuery } from "@tanstack/react-query";

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
