import type {
  CreateQtShareRequest,
  QtShareDetail,
  QtShareListResponse,
  UpdateQtShareRequest,
} from "@onnuri/shared";

import { apiClient } from "../../shared/api/client";

export interface QtShareQuery {
  year?: number;
  month?: number;
  /** true면 내 글만 (로그인 필요) */
  mine?: boolean;
}

// 큐티나눔 목록 (GET /posts/qt-shares). 연·월을 생략하면 서버가 글이 있는 가장 최근 달을 골라 준다.
export async function fetchQtShares(query: QtShareQuery): Promise<QtShareListResponse> {
  const { data } = await apiClient.get<QtShareListResponse>("/posts/qt-shares", {
    params: query,
  });
  return data;
}

// 좋아요는 토글 한 번이 아니라 켜기/끄기를 따로 보낸다 — 같은 요청이 두 번 가도(재시도 등)
// 결과가 뒤집히지 않는다. 좋아요는 게시판과 무관하게 Post에 붙어서 경로도 /posts/:id다.
export async function likePost(postId: string): Promise<void> {
  await apiClient.post(`/posts/${postId}/likes`);
}

export async function unlikePost(postId: string): Promise<void> {
  await apiClient.delete(`/posts/${postId}/likes`);
}

// 큐티나눔 상세 (GET /posts/qt-shares/:id).
export async function fetchQtDetails(postId: string): Promise<QtShareDetail> {
  const {data} = await apiClient.get<QtShareDetail>(`/posts/qt-shares/${postId}`)
  return data
}

// 작성·수정은 저장된 글을 상세 모양으로 돌려준다 — 받은 값을 상세 캐시에 그대로 넣는다.
// 사진은 URL로만 보낸다 (파일은 shared/api/upload의 uploadImage가 먼저 올린다).
export async function createQtShare(body: CreateQtShareRequest): Promise<QtShareDetail> {
  const { data } = await apiClient.post<QtShareDetail>("/posts/qt-shares", body);
  return data;
}

export async function updateQtShare(
  postId: string,
  body: UpdateQtShareRequest,
): Promise<QtShareDetail> {
  const { data } = await apiClient.patch<QtShareDetail>(`/posts/qt-shares/${postId}`, body);
  return data;
}

export async function deleteQtShare(postId: string): Promise<void> {
  await apiClient.delete(`/posts/qt-shares/${postId}`);
}