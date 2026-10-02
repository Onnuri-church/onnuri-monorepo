import type {
  CreateTeamActivityRequest,
  PostComment,
  TeamActivityDetail,
  TeamActivityListResponse,
  UpdateTeamActivityRequest,
} from "@onnuri/shared";

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

// 부서활동 상세 (GET /posts/team-activities/:id). 댓글·대댓글까지 함께 온다.
// 서버가 이 요청으로 조회수를 1 올린다.
export async function fetchTeamActivity(
  postId: string,
): Promise<TeamActivityDetail> {
  const { data } = await apiClient.get<TeamActivityDetail>(
    `/posts/team-activities/${postId}`,
  );
  return data;
}

// 댓글·대댓글 작성. parentId를 주면 그 댓글의 답글이 된다 (깊이는 1단계까지).
// 댓글은 게시판 공용이라 경로가 /posts/:id다.
export async function addComment(
  postId: string,
  content: string,
  parentId?: string,
): Promise<PostComment> {
  const { data } = await apiClient.post<PostComment>(
    `/posts/${postId}/comments`,
    { content, parentId },
  );
  return data;
}

export async function deleteComment(
  postId: string,
  commentId: string,
): Promise<void> {
  await apiClient.delete(`/posts/${postId}/comments/${commentId}`);
}

// 부서활동 작성 (POST /posts/team-activities). 그 팀의 팀원·관리자만 쓸 수 있다.
// 사진은 URL로만 보낸다 (파일은 shared/api/upload의 uploadImage가 먼저 올린다).
export async function createTeamActivity(
  body: CreateTeamActivityRequest,
): Promise<TeamActivityDetail> {
  const { data } = await apiClient.post<TeamActivityDetail>(
    "/posts/team-activities",
    body,
  );
  return data;
}

// 부서활동 수정 (PATCH /posts/team-activities/:id). 내 글만 고칠 수 있고 팀은 못 바꾼다.
// imageUrls는 사진 전체 교체다 — 글쓰기 화면이 최종 목록을 통째로 보낸다.
export async function updateTeamActivity(
  postId: string,
  body: UpdateTeamActivityRequest,
): Promise<TeamActivityDetail> {
  const { data } = await apiClient.patch<TeamActivityDetail>(
    `/posts/team-activities/${postId}`,
    body,
  );
  return data;
}

// 부서활동 삭제 (상세 ⋮ > 삭제하기). 내 글만 지울 수 있고 서버는 soft delete한다.
export async function deleteTeamActivity(postId: string): Promise<void> {
  await apiClient.delete(`/posts/team-activities/${postId}`);
}

// 좋아요는 토글 한 번이 아니라 켜기/끄기를 따로 보낸다 — 같은 요청이 두 번 가도(재시도 등)
// 결과가 뒤집히지 않는다. 좋아요도 게시판과 무관해서 경로가 /posts/:id다.
export async function toggleLike(
  postId: string,
  likedByMe: boolean,
): Promise<void> {
  if (likedByMe) {
    await apiClient.delete(`/posts/${postId}/likes`);
    return;
  }
  await apiClient.post(`/posts/${postId}/likes`);
}
