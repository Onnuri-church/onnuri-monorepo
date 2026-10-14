import { useQuery } from "@tanstack/react-query";
import type { MyStatsResponse } from "@onnuri/shared";

import { apiClient } from "../../shared/api/client";

// 마이페이지 통계 카드 3종 (GET /users/me/stats). 게스트는 401이라 조회하지 않는다.
export function useMyStats(enabled: boolean) {
  return useQuery({
    queryKey: ["my-stats"],
    queryFn: () =>
      apiClient.get<MyStatsResponse>("/users/me/stats").then((res) => res.data),
    enabled,
  });
}
