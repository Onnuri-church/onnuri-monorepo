import type {
  AddTeamMembersRequest,
  CreateTeamMessageRequest,
  CreateTeamRequest,
  TeamDetailResponse,
  TeamGalleryMonth,
  TeamMemberCandidate,
  TeamMessageInfo,
  TeamRole,
  TeamSummary,
  UpdateTeamRequest,
} from "@onnuri/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "../../shared/api/client";
import { i18n } from "../../shared/i18n";
import { uploadImage } from "../../shared/api/upload";
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

// 팀 단톡 — 실시간 연결 없이 켜져 있는 동안 몇 초마다 새로 받는다 (푸시 알림은 없다).
const TEAM_CHAT_POLL_MS = 4000;

export function useTeamMessages(teamId: string, polling: boolean) {
  return useQuery({
    queryKey: ["team-messages", teamId],
    queryFn: () =>
      apiClient.get<TeamMessageInfo[]>(`/teams/${teamId}/messages`).then((res) => res.data),
    refetchInterval: polling ? TEAM_CHAT_POLL_MS : false,
  });
}

export function useSendTeamMessage(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      apiClient
        .post<TeamMessageInfo>(`/teams/${teamId}/messages`, {
          content,
        } satisfies CreateTeamMessageRequest)
        .then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["team-messages", teamId] }),
  });
}

export function useDeleteTeamMessage(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => apiClient.delete(`/teams/${teamId}/messages/${messageId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["team-messages", teamId] }),
  });
}

// 팀 상세·팀원 리스트용. 팀원 목록이 이 응답에 들어 있어 팀원 화면도 같은 캐시를 쓴다.
export function useTeamDetail(teamId: string) {
  return useQuery({
    queryKey: ["teams", teamId],
    queryFn: () =>
      apiClient.get<TeamDetailResponse>(`/teams/${teamId}`).then((res) => res.data),
    // 팀 폼이 생성 모드일 때 빈 id로 부른다 — 그때는 조회하지 않는다
    // (빈 id는 /teams/ 가 되어 목록이 돌아온다).
    enabled: teamId !== "",
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
  return role === "LEADER" ? i18n.t("팀장") : i18n.t("팀원");
}

// 갤러리 사진 추가 — 화면이 포토 피커로 고른 로컬 사진을 먼저 uploadImage로 올리고
// 그 주소를 넘긴다 (셀 갤러리와 같은 흐름). 응답이 갱신된 월 목록이라 캐시를 바로 갈아끼운다.
export function useAddTeamPhoto(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (uri: string) => {
      const url = await uploadImage(uri);
      const res = await apiClient.post<TeamGalleryMonth[]>(`/teams/${teamId}/gallery`, { url });
      return res.data;
    },
    onSuccess: (months) => queryClient.setQueryData(["team-gallery", teamId], months),
  });
}

export function useRemoveTeamPhotos(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (imageIds: string[]) =>
      apiClient
        .delete<TeamGalleryMonth[]>(`/teams/${teamId}/gallery`, { data: { imageIds } })
        .then((res) => res.data),
    onSuccess: (months) => queryClient.setQueryData(["team-gallery", teamId], months),
  });
}

// ── 팀 관리 (관리자 전용) ────────────────────────────────────────────────
// 팀장 지정이 소속 팀을 바꾸므로 /users/me(내 소속)와 회원 목록(소속 표시)까지 같이 무효화한다.
function useTeamMutation<TArgs>(run: (args: TArgs) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
    },
  });
}

export function useCreateTeam() {
  return useTeamMutation((body: CreateTeamRequest) => apiClient.post("/teams", body));
}

export function useUpdateTeam(teamId: string) {
  return useTeamMutation((body: UpdateTeamRequest) =>
    apiClient.patch(`/teams/${teamId}`, body),
  );
}

export function useDeleteTeam() {
  return useTeamMutation((teamId: string) => apiClient.delete(`/teams/${teamId}`));
}

// ── 팀원 관리 (팀장·관리자) ──────────────────────────────────────────────
// 팀원이 바뀌면 상세(팀원 목록)와 /users/me(내 소속), 회원 목록(소속 표시)이 같이 영향받는다.
function useTeamMemberMutation<TArgs>(teamId: string, run: (args: TArgs) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-candidates", teamId] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
    },
  });
}

// 팀원 추가 화면의 후보 명단 — 이미 그 팀에 있는 사람은 서버가 빼고 내려준다.
export function useTeamMemberCandidates(teamId: string) {
  return useQuery({
    queryKey: ["team-candidates", teamId],
    queryFn: () =>
      apiClient
        .get<TeamMemberCandidate[]>(`/teams/${teamId}/members/candidates`)
        .then((res) => res.data),
  });
}

export function useAddTeamMembers(teamId: string) {
  return useTeamMemberMutation(teamId, (userIds: string[]) =>
    apiClient.post(`/teams/${teamId}/members`, { userIds } satisfies AddTeamMembersRequest),
  );
}

export function useRemoveTeamMember(teamId: string) {
  return useTeamMemberMutation(teamId, (userId: string) =>
    apiClient.delete(`/teams/${teamId}/members/${userId}`),
  );
}
