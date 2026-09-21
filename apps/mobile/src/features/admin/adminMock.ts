// 관리자 화면(출석부·데이터 다운로드) 목업 데이터 — 2026-09-09 관리자 시안 값 그대로.
// 회원 관리 목업은 GET /users 실데이터로 교체돼 제거됐다. 출석부 집계 API가 붙으면 나머지도 지운다.

// ── 출석부 ──────────────────────────────────────────────────────────────
// 칸 하나 = 그 주의 예배/셀모임 참석 여부 짝. "-"는 셀모임이 없던 주(결석 아님 — erd.md).
export type AttendanceMark = "O" | "X" | "-";
export type WeekAttendance = [worship: AttendanceMark, meeting: AttendanceMark];

export interface AttendanceRow {
  id: string;
  name: string;
  role?: "leader" | "viceLeader";
  weeks: WeekAttendance[];
}

export interface AttendanceGroup {
  id: string;
  name: string;
  rows: AttendanceRow[];
}

/** 표 머리의 주차 날짜 (시안: 2026년 8월) */
export const ATTENDANCE_DATES = ["8/2", "8/9", "8/16", "8/23", "8/30"];

export const ATTENDANCE_BY_CELL: AttendanceGroup[] = [
  {
    id: "c1",
    name: "수빈셀",
    rows: [
      {
        id: "a1",
        name: "신수빈",
        role: "leader",
        weeks: [["O", "O"], ["O", "O"], ["O", "X"], ["O", "O"], ["O", "O"]],
      },
      {
        id: "a2",
        name: "남현지",
        role: "viceLeader",
        weeks: [["O", "O"], ["O", "X"], ["O", "O"], ["O", "O"], ["X", "X"]],
      },
      {
        id: "a3",
        name: "고다원",
        weeks: [["O", "O"], ["O", "O"], ["O", "O"], ["X", "O"], ["O", "O"]],
      },
      {
        id: "a4",
        name: "윤채원",
        weeks: [["X", "X"], ["O", "O"], ["O", "-"], ["O", "O"], ["O", "X"]],
      },
    ],
  },
  {
    id: "c2",
    name: "서연셀",
    rows: [
      {
        id: "a5",
        name: "이서연",
        role: "leader",
        weeks: [["O", "O"], ["O", "O"], ["O", "O"], ["O", "O"], ["O", "O"]],
      },
      {
        id: "a6",
        name: "김민준",
        role: "viceLeader",
        weeks: [["O", "X"], ["O", "O"], ["O", "O"], ["X", "X"], ["O", "O"]],
      },
      {
        id: "a7",
        name: "박지훈",
        weeks: [["O", "O"], ["X", "X"], ["O", "X"], ["O", "O"], ["O", "O"]],
      },
      {
        id: "a8",
        name: "최유진",
        weeks: [["O", "O"], ["O", "O"], ["X", "O"], ["O", "O"], ["X", "X"]],
      },
    ],
  },
];

export const ATTENDANCE_BY_TEAM: AttendanceGroup[] = [
  {
    id: "t1",
    name: "SNS팀",
    rows: [
      {
        id: "b1",
        name: "이서연",
        role: "leader",
        weeks: [["O", "O"], ["O", "O"], ["O", "O"], ["O", "O"], ["O", "O"]],
      },
      {
        id: "b2",
        name: "남현지",
        role: "viceLeader",
        weeks: [["O", "O"], ["O", "X"], ["O", "O"], ["O", "O"], ["X", "X"]],
      },
      {
        id: "b3",
        name: "고다원",
        weeks: [["O", "O"], ["O", "O"], ["O", "O"], ["X", "O"], ["O", "O"]],
      },
      {
        id: "b4",
        name: "박지훈",
        weeks: [["O", "O"], ["X", "X"], ["O", "X"], ["O", "O"], ["O", "O"]],
      },
      {
        id: "b5",
        name: "정하은",
        weeks: [["O", "O"], ["O", "O"], ["O", "O"], ["O", "X"], ["O", "O"]],
      },
      {
        id: "b6",
        name: "강도윤",
        weeks: [["X", "X"], ["O", "O"], ["O", "O"], ["O", "O"], ["O", "O"]],
      },
    ],
  },
];

/** 출석부·데이터 다운로드의 셀/팀 선택지 (시안 액션시트 목록) */
export const ADMIN_CELL_NAMES = [
  "수빈셀",
  "서연셀",
  "하은셀",
  "도윤셀",
  "민준셀",
  "지훈셀",
  "유진셀",
];
export const ADMIN_TEAM_NAMES = [
  "찬양팀",
  "디자인팀",
  "방송팀",
  "영상팀",
  "중보기도팀",
  "풋살팀",
  "SNS팀",
];
