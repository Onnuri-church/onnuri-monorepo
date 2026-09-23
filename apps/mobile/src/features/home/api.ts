import type { HomeBanner } from "@onnuri/shared";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "../../shared/api/client";

// 홈 상단 배너 — 관리자가 등록한 것 중 최신 1건. 없으면 null(홈이 기본 문구로 폴백).
export function useHomeBanner() {
  return useQuery({
    queryKey: ["banner", "active"],
    queryFn: () => apiClient.get<HomeBanner | null>("/notices/banner").then((res) => res.data),
  });
}
