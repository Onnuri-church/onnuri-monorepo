// DB 스키마(apps/api/prisma/schema.prisma)의 Post·게시판 enum을 따른다. 게시판별 고유 필드
// (익명 여부, 공개기간, 모집 상태 등)는 1:1 확장 테이블 소관이라 각 API DTO에서 내려준다.

import type { TeamSummary } from "./user";

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

/** 소그룹 멤버십 역할. LEADER(소그룹장)는 생성 폼에서 한 명 이상 지정(다중 가능) — 전원이 참여 승인/거절 권한. */
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

/** 큐티나눔 상세 (GET /posts/qt-shares/:id). */
export interface QtShareDetail {
  id: string;
  authorName: string;
  authorAvatarUrl: string | null;
  /** 큐티 날짜 — "05월 27일". 목록의 dateLabel("2026.05.07")과 형식이 다르다 (상세 화면 문구) */
  dateLabel: string;
  /** 작성 시각(ISO). "38분 전" 같은 상대 표기는 시간이 지나면 변해서 서버 문구로 내리면
   *  캐시에 굳으므로, 문구를 만들지 않고 앱이 계산하게 한다 */
  createdAt: string;
  title: string;
  /** 말씀 구절 — "룻기 2:16-23" */
  passage: string | null;
  content: string;
  /** 배경사진 — 작성 화면의 단일 업로드. Post의 컬럼이라 한 장뿐이다 */
  coverImageUrl: string | null;
  /** 본문사진 — 작성 화면에서 최대 5장. Image 테이블에 따로 쌓이므로 sortOrder 순으로 내려준다 */
  imageUrls: string[];
  likeCount: number;
  likedByMe: boolean;
  /** 내가 쓴 글인지 — 수정·삭제 메뉴를 띄울지 정한다. 권한 판단은 서버가 한다 */
  isMine: boolean;
}

/** 셀 소식 목록 항목 (GET /posts/cell-news?cellId=). */
export interface CellNewsListItem {
  id: string;
  title: string;
  /** 소식 날짜(eventDate) — "08월 21일" */
  dateLabel: string;
  /** 작성 시각(ISO). "38분 전"은 앱이 계산한다 (큐티 상세와 같은 이유 — 캐시에 굳지 않게) */
  createdAt: string;
}

/** 게시글 댓글 — Comment 테이블은 게시판 공용이라 셀 소식 전용이 아니다. */
export interface PostComment {
  id: string;
  authorName: string;
  authorAvatarUrl: string | null;
  createdAt: string;
  content: string;
}

/** 셀 소식 상세 (GET /posts/cell-news/:id). */
export interface CellNewsDetail {
  id: string;
  cellId: string;
  title: string;
  content: string;
  /** "08월 21일" */
  dateLabel: string;
  /** 소식 날짜 원본 (YYYY-MM-DD) — 수정 화면 프리필용 */
  eventDate: string;
  createdAt: string;
  authorName: string;
  authorAvatarUrl: string | null;
  /** 본문사진 — 업로드 인프라가 붙기 전까지는 빈 배열 */
  imageUrls: string[];
  likeCount: number;
  likedByMe: boolean;
  /** 내가 쓴 글인지 — 수정·삭제 메뉴 노출 기준의 일부 (셀장·관리자도 삭제 가능) */
  isMine: boolean;
  comments: PostComment[];
}

/** 부서활동 목록 카드 (GET /posts/team-activities). */
export interface TeamActivityListItem {
  id: string;
  teamId: string;
  /** 팀 이름(칩 문구) — "SNS팀" */
  teamName: string;
  /** 칩 색을 고르는 키 — "sns"·"praise" 등. 모르는 값이면 앱이 폴백 색을 쓴다 */
  department: string;
  /** 활동 날짜 — "2026.05.27" */
  dateLabel: string;
  title: string;
  /** 본문 한 줄 미리보기 */
  description: string;
  /** 작성 시각(ISO). "22시간 전"은 앱이 계산한다 */
  createdAt: string;
  viewCount: number;
  /** 최상위 댓글 수 — 대댓글은 세지 않는다 (시안: 댓글 3줄에 "댓글 2") */
  commentCount: number;
  likeCount: number;
}

/**
 * 부서활동 목록 응답. 필터 칩에 쓸 팀 목록을 같이 내려준다 — GET /teams는 로그인이
 * 필요한데 이 게시판은 게스트도 열람하므로, 앱이 팀 목록을 따로 못 받는다.
 * (큐티나눔이 월 목록을 함께 내려주는 것과 같은 방식.)
 */
export interface TeamActivityListResponse {
  teams: TeamSummary[];
  /** null이면 전체 — "전체" 칩은 앱이 맨 앞에 붙인다 */
  selectedTeamId: string | null;
  items: TeamActivityListItem[];
}

/** POST /posts/cell-news 요청 본문 (응답은 CellNewsDetail). */
export interface CreateCellNewsRequest {
  cellId: string;
  title: string;
  content: string;
  /** YYYY-MM-DD */
  eventDate: string;
  /** 본문 사진 (최대 5장) — POST /uploads로 받은 주소. 갤러리에 자동 포함된다 */
  imageUrls?: string[];
}

/** PATCH /posts/cell-news/:id 요청 본문 — 보낸 필드만 반영, imageUrls는 전체 교체. */
export interface UpdateCellNewsRequest {
  title?: string;
  content?: string;
  /** YYYY-MM-DD */
  eventDate?: string;
  imageUrls?: string[];
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
