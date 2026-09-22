import type { TeamDetailResponse, TeamGalleryMonth, TeamRole, TeamSummary } from "@onnuri/shared";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "../../shared/api/client";
import { fetchTeams } from "../profile/api";

// 전체 팀 목록 — 프로필 설정 선택지와 같은 GET /teams라 쿼리 키도 공유한다 (한 번 받으면 둘 다 씀).
export function useTeams() {
  return useQuery({ queryKey: ["teams"], queryFn: fetchTeams });
}

// 헤더 제목처럼 팀 하나의 요약만 필요한 화면용 — 목록 캐시에서 찾는다 (별도 요청 없음).
export function useTeam(teamId: string): TeamSummary | undefined {
  const { data } = useTeams();
  return data?.find((team) => team.id === teamId);
}

// 팀 상세·팀원 리스트용. 팀원 목록이 이 응답에 들어 있어 팀원 화면도 같은 캐시를 쓴다.
export function useTeamDetail(teamId: string) {
  return useQuery({
    queryKey: ["teams", teamId],
    queryFn: () =>
      apiClient.get<TeamDetailResponse>(`/teams/${teamId}`).then((res) => res.data),
  });
}

// 갤러리 — 상세의 사진 미리보기·전체 장수도 이걸 쓴다 (캐시를 공유해 갤러리로 넘어갈 때 다시 안 받는다).
export function useTeamGallery(teamId: string) {
  return useQuery({
    queryKey: ["team-gallery", teamId],
    queryFn: () =>
      apiClient.get<TeamGalleryMonth[]>(`/teams/${teamId}/gallery`).then((res) => res.data),
  });
}

// 서버 enum(TeamRole) → 화면에 그대로 찍는 역할 문구.
export function toTeamRoleLabel(role: TeamRole): string {
  return role === "LEADER" ? "팀장" : "팀원";
}
