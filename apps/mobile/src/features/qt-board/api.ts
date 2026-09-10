import type { QtShareListResponse } from "@onnuri/shared";

import { apiClient } from "../../shared/api/client";

// 큐티나눔 목록 (GET /posts/qt-shares). month를 생략하면 서버가 가장 최근 달을 골라 준다.
export async function fetchQtShares(month?: string): Promise<QtShareListResponse> {
  const { data } = await apiClient.get<QtShareListResponse>("/posts/qt-shares", {
    params: month ? { month } : undefined,
  });
  return data;
}
