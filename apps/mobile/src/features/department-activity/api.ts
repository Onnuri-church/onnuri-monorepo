import type { TeamActivityListResponse } from "@onnuri/shared";

import { apiClient } from "../../shared/api/client";

// 부서활동 목록 (GET /posts/team-activities). teamId를 생략하면 전체 팀 글을 최신순으로 준다.
// 필터 칩에 쓸 팀 목록도 같은 응답에 들어 있다 — GET /teams는 로그인이 필요한데
// 이 게시판은 게스트도 열람하기 때문이다.
export async function fetchTeamActivities(
  teamId?: string,
): Promise<TeamActivityListResponse> {
  const { data } = await apiClient.get<TeamActivityListResponse>(
    "/posts/team-activities",
    { params: teamId ? { teamId } : undefined },
  );
  return data;
}
