/**
 * QR 예배 출석 (POST /attendance/check-in).
 * QR 내용은 고정 문자열(ATTENDANCE_QR_CODE) — 입구에 항상 같은 인쇄물을 붙인다.
 * 부정 스캔은 시간창(12:00~14:30, 2026-09-04 확정)으로 막는다.
 */

/** 입구 QR에 인코딩하는 고정 문자열 — 앱이 선검증하고 서버가 재검증한다 */
export const ATTENDANCE_QR_CODE = "onnuri-worship-attendance";

/** POST /attendance/check-in 요청 본문 */
export interface QrCheckInRequest {
  code: string;
}

/** POST /attendance/check-in 응답 — 성공과 중복을 한 모양으로 내려준다 */
export interface QrCheckInResponse {
  /** true면 이미 출석된 상태 — checkedAt은 그때의 기록이다 */
  duplicate: boolean;
  userName: string;
  /** 예: "4부 청년 주일예배" */
  serviceName: string;
  /** 출석 기록 시각 (ISO) — 표시 문구("2026.08.02 (일) 13:40")는 앱이 조립한다 */
  checkedAt: string;
  /** 진행 중 소속 셀 — 없으면 null */
  cellName: string | null;
}
