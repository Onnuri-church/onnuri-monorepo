// 출석 관리 화면 타입·날짜 헬퍼. 출석 데이터는 /cells/:id/attendance 실데이터 (api.ts).
// 셀모임은 일요일 단위라 날짜 선택지는 "그 달의 일요일들"이다.

export type AttendanceStatus = "present" | "absent";

export interface MemberAttendance {
  memberId: string;
  name: string;
  avatarUrl: string | null;
  /** 예배 출석 */
  worship: AttendanceStatus;
  /** 셀모임 참석 */
  meeting: AttendanceStatus;
}

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

/** 해당 연·월(1~12)의 일요일 목록. */
export function getSundaysOfMonth(year: number, month: number): Date[] {
  const sundays: Date[] = [];
  const date = new Date(year, month - 1, 1);
  while (date.getMonth() === month - 1) {
    if (date.getDay() === 0) sundays.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return sundays;
}

/** "2026.08.02 (일)" 형식. */
export function formatSundayLabel(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}.${month}.${day} (${WEEKDAY_LABELS[date.getDay()]})`;
}

/** 가장 최근 일요일 — 출석 관리의 기본 선택 날짜. */
export function getLatestSunday(base: Date): Date {
  const date = new Date(base);
  date.setDate(date.getDate() - date.getDay());
  return date;
}
