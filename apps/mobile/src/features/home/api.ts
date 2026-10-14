import type { HomeBanner, HomePostsResponse } from "@onnuri/shared";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "../../shared/api/client";

// 홈 상단 배너 — 관리자가 등록한 것 중 최신 1건. 없으면 null(홈이 기본 문구로 폴백).
export function useHomeBanner() {
  return useQuery({
    queryKey: ["banner", "active"],
    queryFn: () => apiClient.get<HomeBanner | null>("/notices/banner").then((res) => res.data),
  });
}

// 홈 큐티나눔(최신 3건)·부서활동(최신 5건) — 게시판 목록과 필드가 달라 홈 전용 API를 쓴다.
// 두 게시판을 한 번에 받아서 게시판 키(["qt-shares"]·["team-activities"])의 접두어로 묶을 수
// 없다 — 부서활동 작성·삭제 화면이 이 키를 따로 무효화한다.
export function useHomePosts() {
  return useQuery({
    queryKey: ["home-posts"],
    queryFn: () => apiClient.get<HomePostsResponse>("/posts/home").then((res) => res.data),
  });
}
