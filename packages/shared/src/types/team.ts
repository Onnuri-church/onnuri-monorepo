// DB 스키마(apps/api/prisma/schema.prisma)의 Team·TeamMembership을 따른다 (docs/erd.md 참고).
// 팀 목록 요약(TeamSummary)은 프로필 설정과 같이 쓰는 계약이라 user.ts에 있다.

import type { TeamRole } from "./user";

/** GET /teams/:id 응답의 팀원 한 명 — 진행 중(endedAt 없음) 멤버십 기준 */
export interface TeamMemberInfo {
  /** userId */
  id: string;
  name: string;
  avatarUrl: string | null;
  role: TeamRole;
}

/**
 * GET /teams/:id 응답 — 팀스토리 상세와 팀원 리스트가 같이 쓴다.
 * 팀원은 팀장 → 팀원(이름순)으로 정렬돼 내려온다.
 * 상세 화면의 사진 미리보기·전체 장수는 GET /teams/:id/gallery를 따로 불러 쓴다.
 */
export interface TeamDetailResponse {
  id: string;
  name: string;
  /** 앱이 번들 SVG를 고르는 아이콘 이름 (Team.iconUrl에 저장 — TeamSummary 주석 참고) */
  iconName: string | null;
  /** 목록에 한 줄로 찍는 소개 */
  tagline: string | null;
  /** 상세의 팀 소개 본문 */
  description: string | null;
  coverImageUrl: string | null;
  members: TeamMemberInfo[];
}

// ── 팀 갤러리 (Image 테이블 — 직접 업로드 + 부서활동 글 사진 자동 포함, 2026-09-04 확정) ──

export interface TeamGalleryPhotoInfo {
  /** Image id — 삭제 요청에 쓴다 */
  id: string;
  url: string;
  /** 직접 업로드(GALLERY)만 갤러리 편집에서 지울 수 있다 — 게시글 사진은 글에서 지운다 */
  deletable: boolean;
}

/** GET /teams/:id/gallery 응답 항목 — 최신 달부터 */
export interface TeamGalleryMonth {
  /** "2026년 7월" */
  month: string;
  photos: TeamGalleryPhotoInfo[];
}
