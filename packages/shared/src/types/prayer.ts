/**
 * 기도제목 게시판 (board=PRAYER) API 계약.
 * 표시용 라벨(작성일·D-day·카테고리 한글명) 조립은 앱(features/prayer-board/api.ts) 몫이고,
 * 예외는 authorName — 익명 여부·관리자 실명 노출 판단이 서버 권한이라 완성 문구로 내려준다.
 */

/** Prisma enum PrayerCategory와 같은 값 */
export type PrayerCategoryValue =
  | "PERSONAL_SPIRITUAL"
  | "HEALTH_DAILY"
  | "RELATIONSHIP_COMMUNITY"
  | "INTERCESSION_SERVICE"
  | "OTHER";

export interface PrayerListItem {
  id: string;
  /** 표시용 등록 번호 (No.128) — 삭제돼도 안 바뀜 */
  number: number;
  /** 익명 글은 "익명" — 관리자에게만 "익명(실명)"으로 조립해 내려준다 */
  authorName: string;
  category: PrayerCategoryValue;
  title: string;
  /** ISO datetime */
  createdAt: string;
  /** 공개기간 종료일 (YYYY-MM-DD) — D-day 계산용. 지나면 게시판 목록에서 빠진다 */
  visibleUntil: string;
  /** 로그인 유저의 북마크 여부 (게스트는 false) */
  bookmarked: boolean;
  /** 내가 쓴 글 여부 — 수정/삭제 노출 기준 (게스트는 false) */
  isMine: boolean;
}

/** GET /posts/prayers 응답 */
export interface PrayerListResponse {
  /** 상단 문구용 전체 등록 수 — 카테고리 필터와 무관한 총계 */
  totalCount: number;
  items: PrayerListItem[];
}

/** GET /posts/prayers/:id 응답 */
export interface PrayerDetailResponse extends PrayerListItem {
  content: string;
  viewCount: number;
  photoUrls: string[];
  /** 수정 프리필용 — 목록에서는 authorName 문구로만 드러난다 */
  isAnonymous: boolean;
}

/** POST /posts/prayers 요청 본문 (응답은 PrayerDetailResponse) */
export interface CreatePrayerRequest {
  title: string;
  content: string;
  category: PrayerCategoryValue;
  isAnonymous: boolean;
  /** YYYY-MM-DD */
  visibleUntil: string;
  /** POST /uploads가 돌려준 주소들 */
  imageUrls?: string[];
}

/** PATCH /posts/prayers/:id 요청 본문 (작성자만) — 보낸 필드만 반영, imageUrls는 전체 교체 */
export interface UpdatePrayerRequest {
  title?: string;
  content?: string;
  category?: PrayerCategoryValue;
  isAnonymous?: boolean;
  visibleUntil?: string;
  imageUrls?: string[];
}
