// 출석 관리 목업·날짜 헬퍼. 출석 API가 생기면 목업 부분을 서버 데이터로 교체한다.
// 셀모임은 일요일 단위라 날짜 선택지는 "그 달의 일요일들"이다.

import { getCellDetail } from "./cellDetail";

export type AttendanceStatus = "present" | "absent";

export interface MemberAttendance {
  memberId: string;
  name: string;
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

// QR 출석이 자동 반영된다는 전제라 기본값은 전원 출석이다 — 셀장이 실제와 다른
// 사람만 눌러서 정정한다 (안내 배너 문구와 같은 모델).
export function getInitialAttendance(cellId: string): MemberAttendance[] {
  return getCellDetail(cellId).members.map((member) => ({
    memberId: member.id,
    name: member.name,
    worship: "present",
    meeting: "present",
  }));
}
