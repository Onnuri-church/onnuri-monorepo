import type { ChatFile } from "./chat";

/**
 * 팀 전용 게시판 API 계약 — 그 팀 팀원과 관리자만 읽고 쓴다 (공개 부서활동 게시판과 별개).
 * 글에는 사진(최대 5장)·링크·파일을 붙이고, 댓글·대댓글·이모지 반응을 달 수 있다.
 */

/** 글에 달 수 있는 이모지 (좋아요·싫어요·슬퍼요·행복해요 등). 서버도 이 목록만 받는다. */
export const BOARD_EMOJIS = ["👍", "👎", "❤️", "😊", "😢", "🙏"] as const;
export type BoardEmoji = (typeof BOARD_EMOJIS)[number];

export interface TeamBoardReactionSummary {
  emoji: string;
  count: number;
  /** 내가 누른 이모지인지 — 다시 누르면 취소된다 */
  reactedByMe: boolean;
}

export interface TeamBoardPostInfo {
  id: string;
  teamId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  content: string;
  imageUrls: string[];
  links: string[];
  files: ChatFile[];
  reactions: TeamBoardReactionSummary[];
  commentCount: number;
  /** 공지로 등록된 글인지 — 목록 맨 위에 고정된다 */
  isNotice: boolean;
  /** ISO datetime */
  createdAt: string;
  /** 수정된 적이 있으면 ISO datetime */
  editedAt: string | null;
  isMine: boolean;
  /** 수정 버튼 노출 — 작성자, 그 팀 팀장, 관리자 */
  canEdit: boolean;
  /** 삭제 버튼 노출 — 작성자, 그 팀 팀장, 관리자 */
  canDelete: boolean;
}

export interface TeamBoardCommentInfo {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  content: string;
  createdAt: string;
  isMine: boolean;
  /** 수정 버튼 노출 — 작성자와 관리자 */
  canEdit: boolean;
  canDelete: boolean;
  /** 대댓글 — 1단계까지라 여기 담긴 댓글의 replies는 항상 빈 배열이다 */
  replies: TeamBoardCommentInfo[];
}

/**
 * GET /teams/:teamId/board?year=&month= 응답 — 그 달의 글을 최신순 20개씩.
 * year·month를 안 보내면 이번 달(KST)이다. 공지는 달과 상관없이 첫 쪽 맨 위에 고정된다.
 */
export interface TeamBoardListResponse {
  /** 공지로 등록된 글 — 첫 쪽(cursor 없음)에서만 채워지고, items에는 중복으로 들어가지 않는다 */
  notices: TeamBoardPostInfo[];
  items: TeamBoardPostInfo[];
  nextCursor: string | null;
  /** 연도 선택지 — 첫 글이 올라온 해부터 올해까지 (최신순) */
  years: number[];
  /** 서버가 실제로 조회한 연·월 */
  selectedYear: number;
  selectedMonth: number;
}

/** 이모지를 누른 사람 한 명 — 상세에서 "누가 어떤 이모지를 달았는지" 보여줄 때 쓴다 */
export interface TeamBoardReactor {
  userId: string;
  name: string;
  avatarUrl: string | null;
  emoji: string;
}

/** GET /teams/:teamId/board/:postId 응답 */
export interface TeamBoardPostDetail extends TeamBoardPostInfo {
  comments: TeamBoardCommentInfo[];
  /** 이모지를 누른 사람 전부 (먼저 누른 순) */
  reactors: TeamBoardReactor[];
  /** 글을 읽은 사람 수 ("읽음 N") */
  readCount: number;
}

/** GET /link-previews?url=… 응답 — 지금은 유튜브 주소만 미리보기를 만든다 */
export interface LinkPreview {
  url: string;
  title: string;
  /** 채널 이름 등 */
  description: string | null;
  thumbnailUrl: string | null;
  /** 표시용 도메인 (예: "www.youtube.com") */
  domain: string;
}

/** POST·PATCH /teams/:teamId/board 요청 본문 — 내용이나 첨부 중 하나는 있어야 한다. 수정은 전체 교체 */
export interface SaveTeamBoardPostRequest {
  content: string;
  /** 최대 5장 */
  imageUrls?: string[];
  /** 최대 5개 (http/https 주소) */
  links?: string[];
  /** 최대 3개 (10MB까지) */
  files?: ChatFile[];
  /** true면 공지로 등록한다 (팀장·관리자만). 수정할 때 false면 공지가 해제된다 */
  isNotice?: boolean;
}

/** POST /teams/:teamId/board/:postId/comments 요청 본문 */
export interface CreateTeamBoardCommentRequest {
  content: string;
  /** 대댓글이면 부모 댓글 id (1단계까지) */
  parentId?: string;
}

/** PATCH /teams/:teamId/board/:postId/comments/:commentId 요청 본문 — 작성자·관리자만 */
export interface UpdateTeamBoardCommentRequest {
  content: string;
}

/** PUT /teams/:teamId/board/:postId/reactions 요청 본문 — 이미 누른 이모지면 취소 */
export interface ToggleTeamBoardReactionRequest {
  emoji: string;
}
