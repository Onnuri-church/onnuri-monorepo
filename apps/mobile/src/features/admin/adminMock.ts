// 관리자 화면(회원 관리·출석부·데이터 다운로드) 목업 데이터 — 2026-09-09 관리자 시안 값 그대로.
// API가 붙으면 이 파일을 통째로 지우고 각 화면이 서버 데이터를 조회한다.

/** 회원 목록·상세의 뱃지. 등급 실체는 isAdmin+멤버십 역할이지만 목업은 표시용 값만 든다. */
export type AdminMemberBadge = "admin" | "teamLeader" | "cellLeader";

export interface AdminMember {
  id: string;
  name: string;
  cellName: string;
  teamName: string;
  badge?: AdminMemberBadge;
  /** YYYY.MM.DD */
  birthDate: string;
  gender: "남성" | "여성";
  /** 상세의 "권한" 행 표기 */
  roleLabel: string;
  /** YYYY.MM.DD */
  joinedAt: string;
}

export const ADMIN_MEMBERS: AdminMember[] = [
  {
    id: "m1",
    name: "온누리",
    cellName: "누리셀",
    teamName: "SNS팀",
    badge: "admin",
    birthDate: "1999.05.21",
    gender: "여성",
    roleLabel: "관리자",
    joinedAt: "2026.01.05",
  },
  {
    id: "m2",
    name: "원준호",
    cellName: "누리셀",
    teamName: "찬양팀",
    badge: "teamLeader",
    birthDate: "2001.03.14",
    gender: "남성",
    roleLabel: "팀장",
    joinedAt: "2026.01.12",
  },
  {
    id: "m3",
    name: "김민준",
    cellName: "사랑셀",
    teamName: "방송팀",
    badge: "cellLeader",
    birthDate: "2000.11.02",
    gender: "남성",
    roleLabel: "팔로워",
    joinedAt: "2026.01.12",
  },
  {
    id: "m4",
    name: "이서연",
    cellName: "사랑셀",
    teamName: "디자인팀",
    birthDate: "2002.07.19",
    gender: "여성",
    roleLabel: "일반",
    joinedAt: "2026.02.01",
  },
  {
    id: "m5",
    name: "박지훈",
    cellName: "소망셀",
    teamName: "영상팀",
    birthDate: "2001.09.30",
    gender: "남성",
    roleLabel: "일반",
    joinedAt: "2026.02.01",
  },
  {
    id: "m6",
    name: "최유진",
    cellName: "소망셀",
    teamName: "풋살팀",
    birthDate: "2003.01.08",
    gender: "여성",
    roleLabel: "일반",
    joinedAt: "2026.02.15",
  },
  {
    id: "m7",
    name: "정하은",
    cellName: "믿음셀",
    teamName: "중보기도팀",
    birthDate: "2002.12.25",
    gender: "여성",
    roleLabel: "일반",
    joinedAt: "2026.03.02",
  },
  {
    id: "m8",
    name: "강도윤",
    cellName: "믿음셀",
    teamName: "SNS팀",
    birthDate: "2000.04.17",
    gender: "남성",
    roleLabel: "일반",
    joinedAt: "2026.03.02",
  },
];

export function findAdminMember(memberId: string): AdminMember | undefined {
  return ADMIN_MEMBERS.find((member) => member.id === memberId);
}

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
