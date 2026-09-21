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
