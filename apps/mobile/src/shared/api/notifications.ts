import { useQuery } from "@tanstack/react-query";

import { apiClient } from "./client";

// 벨 아이콘의 안읽음 뱃지 — 개수만 가볍게 묻는다. 헤더(공용)와 마이페이지가 같이 쓰므로
// features가 아니라 shared에 둔다. staleTime 0: 벨이 다시 그려질 때마다 최신을 묻는다.
// 게스트는 401이라 호출부가 enabled로 끈다.
export function useUnreadNotificationCount(enabled = true) {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () =>
      apiClient.get<{ count: number }>("/notifications/unread-count").then((res) => res.data),
    enabled,
    staleTime: 0,
  });
}
