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
  /** 진행 중인 팀 소속 전부 (여러 팀 소속 가능). `team`은 이 중 첫 번째다 */
  teams: { id: string; name: string; role: TeamRole }[];
  /** 주보 등록 가능 — 관리자이거나 업로드 권한이 켜진 팀의 팀원 */
  canUploadBulletin: boolean;
  /** 홈 배너 관리 가능 — 관리자이거나 배너 권한이 켜진 팀의 팀원 */
  canManageBanner: boolean;
  /** 전체 리더 방 진입 가능 — 관리자, 팀장(어느 팀이든), 셀장·부셀장 */
  canUseLeaderRooms: boolean;
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
  /** 소속 팀 이름 — 여러 팀이면 쉼표로 이어 붙인다 */
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
  /** 첫 번째 소속 팀 — 여러 팀이면 `teams`를 쓴다 */
  team: { id: string; name: string } | null;
  /** 진행 중인 팀 소속 전부 (여러 팀 가능) */
  teams: { id: string; name: string; role: TeamRole }[];
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

/** GET /users/me/notification-settings 응답 — 설정 화면 알림 토글 3종 (기본 전부 켜짐) */
export interface NotificationSettings {
  /** 말씀영상 업로드 알림 */
  sermonUpload: boolean;
  /** 실시간 예배 시작 알림 */
  liveWorship: boolean;
  /** 큐티나눔 새글 알림 */
  qtNewPost: boolean;
}

/** PATCH /users/me/notification-settings 요청 본문 (응답은 NotificationSettings) — 보낸 필드만 반영 */
export type UpdateNotificationSettingsRequest = Partial<NotificationSettings>;

/** GET /users/me/stats 응답 — 마이페이지 통계 카드 3종 */
export interface MyStatsResponse {
  /** 내가 쓴 큐티나눔 글 수 (삭제 글 제외) */
  qtShareCount: number;
  /** 예배 출석 주수 — 출석 처리된 회차 수 (회차 = 주 1회) */
  attendanceWeeks: number;
  /** 내가 쓴 기도제목 수 (삭제 글 제외) — "내 기도제목" 목록과 같은 기준 */
  prayerCount: number;
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
  /** 단일 팀 지정(이전 호환). 여러 팀이면 teamIds를 쓴다 */
  teamId?: string | null;
  /** 소속 팀 전부 — teamId보다 우선, 빈 배열이 소속 없음 */
  teamIds?: string[];
  /** role이 TEAM_LEADER이고 팀이 여러 개일 때 팀장을 맡을 팀 (생략 시 첫 번째) */
  leaderTeamId?: string;
  role?: AdminMemberRole;
}

/**
 * GET /teams 응답 항목 — 프로필 설정의 소속 팀 선택지와 팀스토리 목록이 같이 쓴다.
 * 선택지 쪽은 id·name만 읽으므로 나머지가 null이어도 상관없다.
 */
export interface TeamSummary {
  id: string;
  name: string;
  /**
   * 앱이 번들 SVG를 고르는 아이콘 이름 (예: "palette"). 시안의 팀 아이콘 7종이 고정이고
   * 관리자가 바꾸는 화면도 없어서, 이미지를 올리는 대신 이름을 Team.iconUrl에 저장한다.
   * 아이콘을 자유롭게 바꿔야 하면 그때 전용 컬럼으로 옮긴다.
   */
  iconName: string | null;
  /** 목록에 한 줄로 찍는 소개 */
  tagline: string | null;
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
  /** 소속 팀 전부 — 빈 배열이 "소속 없음"이다 (여러 팀 소속 가능) */
  teamIds: string[];
}
