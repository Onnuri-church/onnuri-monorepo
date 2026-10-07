// 관리자 화면 전용 집계 계약 (회원 관리 계약은 user.ts에 있다 — GET /users 계열과 묶여 있어서).

/** 출석표 칸 하나 — O=출석, X=결석, -=셀모임이 없던 주(결석 아님, docs/erd.md) */
export type AdminAttendanceMark = "O" | "X" | "-";

export interface AdminAttendanceRow {
  /** userId */
  id: string;
  name: string;
  /** 뱃지 스타일 구분 — leader=채움, viceLeader=테두리 (라벨 문구는 roleLabel) */
  role: "leader" | "viceLeader" | null;
  /** "셀장"/"부셀장"/"팀장" — 스코프에 맞는 문구를 서버가 정한다 */
  roleLabel: string | null;
  /** 주차별 [예배, 셀모임] — dates와 같은 길이 */
  weeks: [AdminAttendanceMark, AdminAttendanceMark][];
}

export interface AdminAttendanceGroup {
  id: string;
  name: string;
  rows: AdminAttendanceRow[];
}

/** GET /admin/attendance 응답 (관리자 전용) */
export interface AdminAttendanceResponse {
  /** 조회한 달 (YYYY-MM) — 월 이동 시 그대로 되돌려 보낸다 */
  month: string;
  /** "2026년 8월" */
  monthLabel: string;
  /** 표 머리 주차 라벨 ("8/2") — 그 달의 일요일들 */
  dates: string[];
  groups: AdminAttendanceGroup[];
}

/** 모임 없는 날 종류 — 지정이 없는 일요일은 예배·셀모임 둘 다 있는 날 */
export type OffDayKind = "WORSHIP_OFF" | "CELL_MEETING_OFF" | "BOTH_OFF";

export interface AdminOffDay {
  /** YYYY-MM-DD (일요일) */
  date: string;
  /** "10/4" */
  label: string;
  /** null = 지정 없음(모임 있는 날) */
  kind: OffDayKind | null;
}

/** GET /admin/off-days?month= 응답 — 그 달의 일요일 전부 */
export interface AdminOffDaysResponse {
  month: string;
  monthLabel: string;
  days: AdminOffDay[];
}

/** PUT /admin/off-days/:date 요청 본문 — kind null이면 지정 해제 */
export interface SetOffDayRequest {
  kind: OffDayKind | null;
  /** 지울 기존 출석 기록이 있을 때 확인을 받은 뒤 true로 다시 보낸다 */
  confirm?: boolean;
}

/** PUT /admin/off-days/:date가 409로 돌려주는 본문 — 지정하면 삭제될 기록 수 */
export interface OffDayConflictBody {
  message: string;
  worshipCount: number;
  cellMeetingCount: number;
}
