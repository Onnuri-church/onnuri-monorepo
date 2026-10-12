import type {
  BulletinDetail,
  BulletinListResponse,
  CreateBulletinRequest,
  UpdateBulletinRequest,
} from "@onnuri/shared";

import { apiClient } from "../../shared/api/client";

// 주보 목록 (GET /bulletins). month를 생략하면 서버가 주보가 있는 가장 최근 달을 골라 준다.
export async function fetchBulletins(month?: string): Promise<BulletinListResponse> {
  const { data } = await apiClient.get<BulletinListResponse>("/bulletins", {
    params: month ? { month } : undefined,
  });
  return data;
}

// 주보 상세 (GET /bulletins/:id). 주보 2장과 나눔지가 한 응답에 같이 와서
// 주보 상세·나눔지 화면이 같은 캐시(["bulletin", id])를 쓴다.
export async function fetchBulletin(id: string): Promise<BulletinDetail> {
  const { data } = await apiClient.get<BulletinDetail>(`/bulletins/${id}`);
  return data;
}

// 주보 등록 (POST /bulletins). 관리자·업로드 권한 팀원만 쓸 수 있고, 이미 주보가 있는 날짜면 400이다.
// 사진은 URL로만 보낸다 (파일은 shared/api/upload의 uploadImage가 먼저 올린다).
export async function createBulletin(body: CreateBulletinRequest): Promise<BulletinDetail> {
  const { data } = await apiClient.post<BulletinDetail>("/bulletins", body);
  return data;
}

// 주보 수정 (PATCH /bulletins/:id) — 날짜는 그대로, 주보·나눔지 이미지를 통째로 바꾼다.
export async function updateBulletin(
  id: string,
  body: UpdateBulletinRequest,
): Promise<BulletinDetail> {
  const { data } = await apiClient.patch<BulletinDetail>(`/bulletins/${id}`, body);
  return data;
}

// 주보 삭제 (DELETE /bulletins/:id) — 그 회차의 주보·나눔지 이미지가 지워진다.
export async function deleteBulletin(id: string): Promise<void> {
  await apiClient.delete(`/bulletins/${id}`);
}
