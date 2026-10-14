import type { QrCheckInRequest, QrCheckInResponse } from "@onnuri/shared";

import { apiClient } from "../../shared/api/client";

// QR 예배 출석 — 스캔한 코드를 서버가 검증하고(고정 문자열·시간창) 출석을 기록한다.
export function checkInWorship(code: string): Promise<QrCheckInResponse> {
  const body: QrCheckInRequest = { code };
  return apiClient.post<QrCheckInResponse>("/attendance/check-in", body).then((res) => res.data);
}
