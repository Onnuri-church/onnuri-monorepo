import type { SermonListResponse, SermonVideo } from "@onnuri/shared";

import { apiClient } from "../../shared/api/client";

// 말씀 게시판 목록 (GET /sermons). month를 생략하면 서버가 가장 최근 달을 골라 준다.
// 영상은 서버가 교회 유튜브 채널에서 주기적으로 가져온다 — 앱에서 등록하는 기능은 없다.
export async function fetchSermons(month?: string): Promise<SermonListResponse> {
  const { data } = await apiClient.get<SermonListResponse>("/sermons", {
    params: month ? { month } : undefined,
  });
  return data;
}

// 설교영상 상세 (GET /sermons/:id).
export async function fetchSermon(id: string): Promise<SermonVideo> {
  const { data } = await apiClient.get<SermonVideo>(`/sermons/${id}`);
  return data;
}
