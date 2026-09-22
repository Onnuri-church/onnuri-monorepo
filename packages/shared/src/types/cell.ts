// DB 스키마(apps/api/prisma/schema.prisma)의 Cell·CellMembership을 따른다 (docs/erd.md 참고).
// 셀 목록 요약(CellSummary)은 프로필 설정과 같이 쓰는 계약이라 user.ts에 있다.

import type { CellRole } from "./user";

/** GET /cells/:id 응답의 구성원 한 명 — 진행 중(endedAt 없음) 멤버십 기준 */
export interface CellMemberInfo {
  /** userId */
  id: string;
  name: string;
  avatarUrl: string | null;
  role: CellRole;
}

/**
 * GET /cells/:id 응답 — 개별 셀 페이지(헤더·구성원 탭)가 쓴다.
 * 구성원은 셀장 → 부셀장 → 셀원(이름순)으로 정렬돼 내려온다.
 */
export interface CellDetailResponse {
  id: string;
  name: string;
  coverImageUrl: string | null;
  /** ISO date (YYYY-MM-DD) */
  startedAt: string;
  /** ISO date — 유통기한(활동 종료 예정일) */
  expiresAt: string;
  members: CellMemberInfo[];
}

// ── 셀 갤러리 (Image 테이블 — 직접 업로드 + 셀 소식 사진 자동 포함, 2026-09-04 확정) ──

export interface CellGalleryPhotoInfo {
  /** Image id — 삭제 요청에 쓴다 */
  id: string;
  url: string;
  /** 직접 업로드(GALLERY)만 갤러리 편집에서 지울 수 있다 — 게시글 사진은 글에서 지운다 */
  deletable: boolean;
}

/** GET /cells/:id/gallery 응답 항목 — 최신 달부터 */
export interface CellGalleryMonth {
  /** "2026년 7월" */
  month: string;
  photos: CellGalleryPhotoInfo[];
}

// ── 출석 관리 (예배 WorshipAttendance + 셀모임 CellMeetingAttendance) ────────────

/** 출석 관리 명단 한 명 — 구성원 정렬(셀장→부셀장→이름순)은 셀 상세와 같다 */
export interface CellAttendanceMember {
  /** userId */
  id: string;
  name: string;
  role: CellRole;
  /** 예배 출석 — QR 자동 기록 + 셀장 수동 정정 결과 */
  worship: boolean;
  /** 셀모임 참석 — 기본 결석, 셀장이 온 사람만 체크 (2026-09-03 확정) */
  meeting: boolean;
}

/** GET /cells/:id/attendance?date= 응답 */
export interface CellAttendanceResponse {
  /** YYYY-MM-DD */
  date: string;
  members: CellAttendanceMember[];
}

/** PUT /cells/:id/attendance 요청 본문 (응답은 CellAttendanceResponse) — 등록하기 일괄 저장 */
export interface SaveCellAttendanceRequest {
  /** YYYY-MM-DD */
  date: string;
  records: { userId: string; worship: boolean; meeting: boolean }[];
}

// ── 팔로워 노트 (셀 케어 기록 — 게시판 Post와 분리, FollowerNote 테이블) ──────────

export interface FollowerNoteCommentInfo {
  id: string;
  authorName: string;
  /** 작성일 — "08.17" */
  dateLabel: string;
  content: string;
  /** 관리자(목사님) 댓글 여부 — 카드의 "목사님 댓글" 표시에 쓴다 */
  isPastor: boolean;
  /** 대댓글 부모 (1단계 깊이만) — null이면 원댓글 */
  parentId: string | null;
}

/** GET /cells/:id/follower-notes 응답 항목 — 게시판 카드와 상세가 같이 쓴다 */
export interface FollowerNoteInfo {
  id: string;
  /** 셀모임 날짜 — "2026.08.02" */
  dateLabel: string;
  /** 셀모임 달 (1~12) — 게시판 월 필터용 */
  month: number;
  /** "(일) 셀모임" */
  meetingLabel: string;
  authorName: string;
  /** 작성일 — "08월 03일". "3주 전"은 앱이 계산한다 */
  writtenDateLabel: string;
  createdAt: string;
  /** 3문항 답변 순서 고정 (빈 답변은 "") */
  answers: string[];
  /** 작성 시각순 — 대댓글은 parentId로 구분 */
  comments: FollowerNoteCommentInfo[];
}

/** POST /cells/:id/follower-notes 요청 본문 (응답은 FollowerNoteInfo) */
export interface CreateFollowerNoteRequest {
  /** 셀모임 날짜 (YYYY-MM-DD) */
  meetingDate: string;
  /** 3문항 답변 — 첫 문항은 필수 (화면 검증과 동일) */
  answers: string[];
}

/**
 * PATCH /cells/:id/follower-notes/:noteId 요청 본문 — 답변만 수정한다
 * (셀모임 날짜는 수정 불가: 날짜를 바꾸려면 삭제 후 재작성).
 */
export interface UpdateFollowerNoteRequest {
  answers: string[];
}
