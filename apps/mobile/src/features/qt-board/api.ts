import type { QtShareListResponse } from "@onnuri/shared";

import { apiClient } from "../../shared/api/client";

// 큐티나눔 목록 (GET /posts/qt-shares). month를 생략하면 서버가 가장 최근 달을 골라 준다.
export async function fetchQtShares(month?: string): Promise<QtShareListResponse> {
  const { data } = await apiClient.get<QtShareListResponse>("/posts/qt-shares", {
    params: month ? { month } : undefined,
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
