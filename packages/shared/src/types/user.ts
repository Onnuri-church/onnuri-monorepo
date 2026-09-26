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

/**
 * GET /users/me · PATCH /users/me 응답 — User에 진행 중(endedAt 없음)인 소속 멤버십을 붙인 형태.
 * 마이페이지가 이름·소속·등급(isAdmin+역할) 표시에 쓴다. soft delete된 셀/팀 소속은 null로 내려온다.
 */
export interface MeResponse extends User {
  cell: { id: string; name: string; role: CellRole } | null;
  team: { id: string; name: string; role: TeamRole } | null;
}

/** GET /cells 응답 항목 — 프로필 설정의 소속 셀 선택지와 전체 셀 목록이 같이 쓴다 */
export interface CellSummary {
  id: string;
  name: string;
  /** 진행 중(endedAt 없음) 멤버십 기준 셀장 — 아직 지정 전이면 null. id는 셀 편집 폼 프리필용 */
  leaderId: string | null;
  leaderName: string | null;
  viceLeaderId: string | null;
  viceLeaderName: string | null;
  /** 활동 종료일 (YYYY-MM-DD) — 셀 편집 폼의 활동기간 프리필용 */
  expiresAt: string;
  /** 셀 커버(단체) 사진 — 편집 폼 프리필용 */
  coverImageUrl: string | null;
}

/** 회원 목록 뱃지 — 관리자 > 팀장 > 셀장(부셀장 포함) 우선순위로 하나만 단다 */
export type AdminMemberBadge = "admin" | "teamLeader" | "cellLeader";

/** GET /users 응답 항목 (관리자 전용) — 회원 관리 목록과 셀장/부셀장 선택지가 같이 쓴다 */
export interface AdminMemberSummary {
  id: string;
  name: string;
  avatarUrl: string | null;
  /** 진행 중 소속 (없으면 null) */
  cellName: string | null;
  teamName: string | null;
  badge: AdminMemberBadge | null;
}

/**
 * 회원 편집의 권한 선택지 — 멤버십 역할로 반영된다 (전역 등급 컬럼이 없다, docs/erd.md).
 * 관리자(isAdmin)는 시안에 있지만 앱 지정 대상에서 제외 (2026-09-21 확정).
 */
export type AdminMemberRole = "GENERAL" | "TEAM_LEADER" | "CELL_LEADER";

/** GET /users/:id 응답 (관리자 전용) — 회원 상세(문구)와 편집(원본 값)이 같이 쓴다 */
export interface AdminMemberDetail {
  id: string;
  name: string;
  avatarUrl: string | null;
  /** "2001.03.14" — 미입력이면 null */
  birthDateLabel: string | null;
  /** YYYY-MM-DD — 편집 프리필용 원본 */
  birthDate: string | null;
  gender: Gender | null;
  /** "남성"/"여성" */
  genderLabel: string | null;
  phone: string | null;
  cell: { id: string; name: string } | null;
  team: { id: string; name: string } | null;
  /** 현재 등급 — 관리자 > 팀장 > 팔로워 > 일반 우선순위로 하나 */
  role: AdminMemberRole;
  /** "관리자"/"팀장"/"팔로워"/"일반" */
  roleLabel: string;
  badge: AdminMemberBadge | null;
  /** "2026.01.12" */
  joinedAtLabel: string;
}

/** PATCH /users/me/avatar 요청 본문 (응답은 MeResponse) — null이면 사진 제거 */
export interface UpdateMyAvatarRequest {
  avatarUrl: string | null;
}

/**
 * PATCH /users/:id 요청 본문 (관리자 전용, 응답은 AdminMemberDetail) — 보낸 필드만 반영.
 * cellId/teamId의 null은 "소속 없음". role은 소속 멤버십 역할로 반영된다:
 * TEAM_LEADER/CELL_LEADER는 해당 소속이 있어야 하고, 다른 쪽 리더 역할은 내려간다(단일 선택 UI).
 */
export interface UpdateAdminMemberRequest {
  name?: string;
  /** YYYY-MM-DD */
  birthDate?: string;
  gender?: Gender;
  phone?: string;
  cellId?: string | null;
  teamId?: string | null;
  role?: AdminMemberRole;
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
