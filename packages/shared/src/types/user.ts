// DB 스키마(apps/api/prisma/schema.prisma)의 User를 따른다 (docs/erd.md 참고).
// 등급은 isAdmin + 멤버십 역할(CellRole/TeamRole)로 표현한다.

export type Gender = "MALE" | "FEMALE";

/** 셀 멤버십 역할. 부셀장(SUB_LEADER)은 셀장과 동일 권한 — 표시만 구분한다. */
export type CellRole = "LEADER" | "SUB_LEADER" | "MEMBER";

export type TeamRole = "LEADER" | "MEMBER";

export interface User {
  id: string;
  name: string;
  /** ISO date (YYYY-MM-DD). 나이는 계산한다. */
  birthDate: string | null;
  gender: Gender | null;
  /** 연락처 — 프로필에서 직접 입력 (본인인증 없음) */
  phone: string | null;
  avatarUrl: string | null;
  /** 한 줄 소개 */
  intro: string | null;
  /** 관리자(임원) — 임원이 수동 지정 */
  isAdmin: boolean;
  /**
   * 프로필 설정 필수 항목(생년월일·성별·전화번호)을 모두 입력했는지 — 서버가 계산해서 내려준다
   * (저장 컬럼 아님). 모바일은 이 값으로 온보딩(프로필 설정 화면) 분기를 판단한다.
   */
  profileCompleted: boolean;
  createdAt: string;
}

/** GET /cells 응답 항목 — 프로필 설정의 소속 셀 선택지 */
export interface CellSummary {
  id: string;
  name: string;
}

/** GET /teams 응답 항목 — 프로필 설정의 소속 팀 선택지 */
export interface TeamSummary {
  id: string;
  name: string;
}

/**
 * PATCH /users/me 요청 본문 (응답은 User).
 * 프로필 설정 화면이 모든 항목을 채워 보내는 계약이라 부분 수정(필드 생략)은 없다.
 * cellId/teamId의 null은 "소속 없음"이다 — 서버는 멤버십 행으로 반영한다.
 */
export interface UpdateMyProfileRequest {
  /** ISO date (YYYY-MM-DD) */
  birthDate: string;
  gender: Gender;
  /** 하이픈 없는 숫자만 (PHONE_NUMBER_REGEX) */
  phone: string;
  cellId: string | null;
  teamId: string | null;
}
