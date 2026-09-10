// DB 스키마(apps/api/prisma/schema.prisma)의 Post·게시판 enum을 따른다. 게시판별 고유 필드
// (익명 여부, 공개기간, 모집 상태 등)는 1:1 확장 테이블 소관이라 각 API DTO에서 내려준다.

export type BoardType =
  | "QT_SHARE" // 큐티나눔
  | "CELL_NEWS" // 셀 소식
  | "TEAM_ACTIVITY" // 부서활동
  | "HOBBY_GROUP" // 취향 소그룹
  | "PRAYER"; // 기도제목

export type PrayerCategory =
  | "PERSONAL_SPIRITUAL"
  | "HEALTH_DAILY"
  | "RELATIONSHIP_COMMUNITY"
  | "INTERCESSION_SERVICE"
  | "OTHER";

export type HobbyGroupStatus = "RECRUITING" | "CLOSED";

/** 소그룹 멤버십 역할. 작성자(개설자) = LEADER(소그룹장) — 참여 승인/거절 권한. */
export type HobbyGroupRole = "LEADER" | "MEMBER";

/** 소그룹 참여는 승인제 — PENDING(신청 취소 가능) / APPROVED(참여 중) / REJECTED. */
export type HobbyGroupMemberStatus = "PENDING" | "APPROVED" | "REJECTED";

/** 큐티나눔 목록 카드 1건 (GET /posts/qt-shares). 화면에 그대로 찍히는 문구는
 *  서버가 만들어 내려준다 — ARCHITECTURE.md App Responsibilities. */
export interface QtShareListItem {
  id: string;
  authorName: string;
  /** 큐티 날짜 — "2026.05.07" */
  dateLabel: string;
  title: string;
  /** 본문. 카드는 2줄까지만 보여준다 */
  description: string;
  likeCount: number;
  /** 로그인한 내가 좋아요를 눌렀는지 — 하트를 채운 상태로 그릴지 정한다 */
  likedByMe: boolean;
}

/** 목록 상단 월 필터 항목. 글이 있는 달만 최신순으로 내려간다. */
export interface QtShareMonth {
  /** "2026.05" — 목록 조회의 month 파라미터로 그대로 되돌려준다 */
  value: string;
  /** "26년 5월" */
  label: string;
}

export interface QtShareListResponse {
  months: QtShareMonth[];
  /** 서버가 실제로 고른 달. 요청한 month에 글이 없으면 최신 달로 바뀌므로, 화면은
   *  요청값이 아니라 이 값을 선택 상태로 표시한다 (글이 하나도 없으면 null). */
  selectedMonth: string | null;
  items: QtShareListItem[];
}

export interface Post {
  id: string;
  board: BoardType;
  authorId: string;
  /** board=CELL_NEWS일 때 채워진다 */
  cellId: string | null;
  /** board=TEAM_ACTIVITY일 때 채워진다 */
  teamId: string | null;
  title: string | null;
  content: string;
  /** ISO date — 큐티·소식·활동 날짜. 갤러리 월별 그룹 기준 */
  eventDate: string | null;
  coverImageUrl: string | null;
  viewCount: number;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}
