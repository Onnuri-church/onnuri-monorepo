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

/**
 * GET /posts/qt-shares 응답. 연도·월은 선택 버튼이라 월은 항상 1~12 전부 고를 수 있고
 * (글 없는 달은 빈 목록), 연도만 서버가 "첫 글이 있는 해 ~ 올해"로 내려준다.
 */
export interface QtShareListResponse {
  /** 연도 선택지 — 최신순. 해가 바뀌면 서버가 자동으로 늘려서 앱 수정이 필요 없다. */
  years: number[];
  /** 서버가 실제로 고른 연·월. year/month를 생략하면 글이 있는 가장 최근 달(글이 없으면
   *  이번 달)로 정해지므로, 화면은 요청값이 아니라 이 값을 선택 상태로 표시한다. */
  selectedYear: number;
  /** 1~12 */
  selectedMonth: number;
  items: QtShareListItem[];
}

/** 큐티나눔 상세 (GET /posts/qt-shares/:id). */
export interface QtShareDetail {
  id: string;
  authorName: string;
  authorAvatarUrl: string | null;
  /** 큐티 날짜 — "05월 27일". 목록의 dateLabel("2026.05.07")과 형식이 다르다 (상세 화면 문구) */
  dateLabel: string;
  /** 같은 날짜의 원본값 — "2026-05-07". 수정 화면이 날짜 입력에 다시 채워 넣을 때 쓴다
   *  (라벨에는 연도가 없어 되돌릴 수 없다) */
  eventDate: string | null;
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
  /** 내가 쓴 글인지 */
  isMine: boolean;
  /** 수정·삭제 메뉴를 띄울지 — 내 글이거나 관리자. 권한 판단은 서버가 한다 */
  canManage: boolean;
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
  /** 내가 쓴 댓글인지 — 삭제 버튼 노출 기준. 게스트로 보면 항상 false */
  isMine: boolean;
  /** 대댓글. 깊이는 1단계까지라 여기 담긴 댓글의 replies는 항상 빈 배열이다 */
  replies: PostComment[];
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

/** 홈 큐티나눔 한 줄 — "제목 / 작성자 | 말씀 구절". */
export interface HomeQtShare {
  id: string;
  authorName: string;
  /** "룻기 2:16-23" — 스키마상 선택값이라 없는 글은 null */
  passage: string | null;
  title: string;
}

/** 홈 부서활동 가로 스크롤 카드 — 썸네일 + 팀 칩 + 제목. */
export interface HomeTeamActivity {
  id: string;
  /** 팀 이름(칩 문구) — "찬양팀" */
  teamName: string;
  /** 칩 색을 고르는 키 — TeamActivityListItem.department와 같은 값 */
  department: string;
  title: string;
  /** 본문 첫 사진, 없으면 상단 이미지(coverImageUrl). 둘 다 없으면 null — 상세와 같은 우선순위 */
  thumbnailUrl: string | null;
}

/**
 * 홈 게시글 섹션 (GET /posts/home). 게시판 목록 API와 필드·조회 조건이 달라서
 * 홈 전용으로 따로 내려준다 — 큐티나눔 최신 3건, 부서활동 최신 5건.
 */
export interface HomePostsResponse {
  qtShares: HomeQtShare[];
  teamActivities: HomeTeamActivity[];
}

/** 부서활동 상세 (GET /posts/team-activities/:id). */
export interface TeamActivityDetail {
  id: string;
  teamId: string;
  teamName: string;
  department: string;
  title: string;
  content: string;
  /** 활동 날짜 — "05월 27일" */
  dateLabel: string;
  /** 활동 날짜 원본 (YYYY-MM-DD) — 수정 화면 프리필용 */
  eventDate: string;
  createdAt: string;
  authorName: string;
  authorAvatarUrl: string | null;
  /** 상단 이미지 — 작성 화면에서 받지 않는 값이라 시드로 넣은 글에만 있다. imageUrls가 비었을 때만 쓴다 */
  coverImageUrl: string | null;
  /** 작성 화면에서 올린 사진(최대 5장). 상세는 이걸 캐러셀로 그린다 */
  imageUrls: string[];
  likeCount: number;
  likedByMe: boolean;
  isMine: boolean;
  /** ⋮(수정·삭제) 노출 기준 — 작성자 본인, 그 팀의 팀장, 관리자 (서버 권한과 동일) */
  canManage: boolean;
  /** 최상위 댓글만 담긴다. 대댓글은 각 댓글의 replies에 있다 */
  comments: PostComment[];
}

/** POST /posts/team-activities 요청 본문 (응답은 TeamActivityDetail). */
export interface CreateTeamActivityRequest {
  /** 어느 팀 활동인지 — 목록 응답의 teams에서 고른다 */
  teamId: string;
  title: string;
  content: string;
  /** 활동 날짜 — YYYY-MM-DD */
  eventDate: string;
  /** 사진 (최대 5장) — POST /uploads로 받은 주소 */
  imageUrls?: string[];
}

/**
 * PATCH /posts/team-activities/:id 요청 본문 (응답은 TeamActivityDetail) — 보낸 필드만 반영.
 * 팀은 글의 정체성이라 바꿀 수 없다. imageUrls를 보내면 사진 전체 교체다 (셀 소식과 동일).
 */
export type UpdateTeamActivityRequest = Partial<Omit<CreateTeamActivityRequest, "teamId">>;

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

/**
 * 큐티나눔 작성 (POST /posts/qt-shares) 요청 본문. 응답은 QtShareDetail.
 * 사진은 본문에 담기 전에 POST /uploads/images로 먼저 올려 URL로 바꾼다 — 글쓰기 요청은
 * 파일이 아니라 URL만 받는다(사진 여러 장과 글 저장이 한 요청에 묶이지 않게).
 */
export interface CreateQtShareRequest {
  /** 큐티 날짜 — "2026-05-07" (YYYY-MM-DD). 목록의 월 필터 기준이라 필수다 */
  eventDate: string;
  title: string;
  content: string;
  /** 말씀 구절 — "룻기 2:16-23" */
  passage: string | null;
  /** 배경사진 (1장) */
  coverImageUrl: string | null;
  /** 본문사진 (최대 5장). 보낸 순서가 그대로 표시 순서가 된다 */
  imageUrls: string[];
}

/**
 * 큐티나눔 수정 (PATCH /posts/qt-shares/:id). 보낸 항목만 바뀐다.
 * imageUrls를 보내면 기존 본문사진을 통째로 이 목록으로 바꾼다 — 작성 화면이 사진 목록
 * 전체를 들고 있어서, 어떤 장이 빠졌는지 서버가 따로 계산할 필요가 없다.
 */
export type UpdateQtShareRequest = Partial<CreateQtShareRequest>;

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
