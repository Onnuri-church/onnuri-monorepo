/**
 * 단톡방(팀·셀) API 계약. 팀 단톡방은 /teams/:teamId/messages, 셀 단톡방은
 * /cells/:cellId/messages — 두 방이 같은 응답·요청 모양을 쓴다.
 * 그 방의 소속 멤버와 관리자만 읽고 쓴다. 푸시 연결 없이 앱이 주기적으로 받아온다.
 */

/** 메시지에 달 수 있는 이모지. 서버도 이 목록만 받는다. */
export const CHAT_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;
export type ChatEmoji = (typeof CHAT_EMOJIS)[number];

/** 한 메시지에 달린 이모지 하나의 집계 */
export interface ChatReactionSummary {
  emoji: string;
  count: number;
  /** 내가 이 이모지를 눌렀는지 — 다시 누르면 취소된다 */
  reactedByMe: boolean;
}

/** 답장 대상 메시지의 미리보기 */
export interface ChatReplyPreview {
  id: string;
  authorName: string;
  /** 사진만 있던 메시지는 빈 문자열 */
  content: string;
  hasImage: boolean;
}

/** 투표 항목 하나 */
export interface ChatPollOptionInfo {
  id: string;
  text: string;
  /** 이 항목에 투표한 사람 수 */
  count: number;
  /** 내가 이 항목에 투표했는지 */
  votedByMe: boolean;
  /** 투표한 사람들 — 익명 투표면 빈 배열이다 (이름은 아무에게도 안 내려간다) */
  voters: { id: string; name: string; avatarUrl: string | null }[];
}

/** 단톡방 투표 — 메시지 목록에서 `poll`로 같이 온다 */
export interface ChatPollInfo {
  id: string;
  title: string;
  options: ChatPollOptionInfo[];
  multiple: boolean;
  anonymous: boolean;
  allowAddOptions: boolean;
  /** 자동 마감 시각 (ISO) — 없으면 직접 마감할 때까지 열려 있다 */
  closesAt: string | null;
  /** 마감됐는지 — 직접 마감했거나 마감 시각이 지난 경우 */
  closed: boolean;
  /** 투표에 참여한 사람 수 (복수 선택이어도 한 명은 한 번만 센다) */
  voterCount: number;
  /** 마감 버튼 노출 기준 — 만든 사람, 그 방의 팀장·셀장·소그룹장, 관리자 */
  canClose: boolean;
}

/** 투표 만들기 입력 — 메시지 보내기(SendChatMessageRequest.poll)에 담아 보낸다 */
export interface CreateChatPollRequest {
  title: string;
  /** 2~10개 */
  options: string[];
  multiple?: boolean;
  anonymous?: boolean;
  allowAddOptions?: boolean;
  /** 자동 마감 시각 (ISO). 없으면 직접 마감 */
  closesAt?: string;
}

/** PUT /chat-polls/:pollId/votes 요청 본문 — 내 선택 전체를 교체한다 (빈 배열이면 투표 취소) */
export interface VoteChatPollRequest {
  optionIds: string[];
}

/** POST /chat-polls/:pollId/options 요청 본문 — allowAddOptions인 투표만 */
export interface AddChatPollOptionRequest {
  text: string;
}

/** 단톡방에 첨부한 파일 (악보·문서) */
export interface ChatFile {
  url: string;
  /** 원본 파일 이름 (확장자 포함) */
  name: string;
  /** 바이트 */
  size: number;
}

export interface ChatMessageInfo {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  /** 사진만 보낸 메시지는 빈 문자열 */
  content: string;
  imageUrls: string[];
  videoUrls: string[];
  files: ChatFile[];
  replyTo: ChatReplyPreview | null;
  /** 투표 메시지면 그 투표 (content는 투표 제목) */
  poll: ChatPollInfo | null;
  /** 언급(@)된 멤버 — 본문에 "@이름"으로 들어 있고, 앱이 강조해서 그린다 */
  mentions: { id: string; name: string }[];
  /** 공지로 등록된 메시지인지 */
  isNotice: boolean;
  reactions: ChatReactionSummary[];
  /** ISO datetime */
  createdAt: string;
  isMine: boolean;
  /** 삭제 버튼 노출 기준 — 내 메시지이거나 관리자 */
  canDelete: boolean;
}

export interface ChatMember {
  id: string;
  name: string;
  avatarUrl: string | null;
}

/** GET /teams/:id/messages · /cells/:id/messages 응답 */
export interface ChatRoomResponse {
  /** 오래된 순, 최근 100건 */
  messages: ChatMessageInfo[];
  /** 가장 최근에 공지로 등록된 메시지 (없으면 null) — 방 상단에 고정해서 보여준다 */
  notice: ChatMessageInfo | null;
  /** 언급 선택지 — 이 방의 멤버 전원 */
  members: ChatMember[];
  /** 공지로 등록·해제할 수 있는지 — 팀장/셀장·부셀장과 관리자 */
  canNotice: boolean;
}

/** POST …/messages 요청 본문 — 내용이나 첨부(사진·동영상·파일) 중 하나는 있어야 하고, 투표도 보낼 수 있다 */
export interface SendChatMessageRequest {
  content: string;
  /** 최대 5장 */
  imageUrls?: string[];
  /** 최대 3개 (50MB까지) */
  videoUrls?: string[];
  /** 최대 3개 (10MB까지, 문서·악보) */
  files?: ChatFile[];
  replyToId?: string;
  mentionedUserIds?: string[];
  /** true면 공지로 등록해서 보낸다 (canNotice인 사람만) */
  asNotice?: boolean;
  /** 있으면 투표 메시지로 보낸다 (content는 무시하고 poll.title을 쓴다) */
  poll?: CreateChatPollRequest;
}

/** PUT …/messages/:id/notice 요청 본문 */
export interface SetChatNoticeRequest {
  on: boolean;
}

/** PUT …/messages/:id/reactions 요청 본문 — 이미 누른 이모지면 취소된다 */
export interface ToggleChatReactionRequest {
  emoji: string;
}

// ---------------------------------------------------------------------
// 팀 단톡방 — 팀장·관리자가 만들고 팀원 중 고른 사람만 들어온다 (카카오톡 단톡방처럼)
// ---------------------------------------------------------------------

/** GET /teams/:teamId/chat-rooms 응답 항목 */
export interface ChatRoomSummary {
  id: string;
  teamId: string;
  name: string;
  memberCount: number;
  /** 안 읽은 메시지 수 — 내가 마지막으로 읽은 뒤 다른 사람이 쓴 메시지 */
  unreadCount: number;
  /** 마지막 메시지 미리보기 (없으면 null) */
  lastMessage: string | null;
  /** ISO datetime — 마지막 메시지 시각, 없으면 방 만든 시각 */
  lastActivityAt: string;
}

/** GET /chat-rooms/:roomId 응답 */
export interface ChatRoomDetail {
  id: string;
  teamId: string;
  name: string;
  members: ChatMember[];
  /** 방 이름 수정·멤버 추가/추방·방 삭제 가능 여부 — 그 팀 팀장과 관리자 */
  canManage: boolean;
}

/** POST /teams/:teamId/chat-rooms 요청 본문 (팀장·관리자) */
export interface CreateChatRoomRequest {
  name: string;
  /** 방에 넣을 팀원 — 그 팀 팀원이어야 한다. 만든 사람이 팀원이면 자동으로 들어간다 */
  memberIds: string[];
}

/** PATCH /chat-rooms/:roomId 요청 본문 (팀장·관리자) */
export interface UpdateChatRoomRequest {
  name: string;
}

/** POST /chat-rooms/:roomId/members 요청 본문 (팀장·관리자) */
export interface AddChatRoomMembersRequest {
  userIds: string[];
}

// ── 전체 리더 방 ─────────────────────────────────────────────────────────
// 팀장·팔로워(셀장·부셀장)·관리자만 들어오는 단톡방들. 관리자가 방을 만들고 멤버를 직접 고른다.
// 방 만들기·이름 수정·멤버 추가/추방 요청은 팀 단톡방과 같은 모양(CreateChatRoomRequest 등)을 쓴다.

/** GET /leader-rooms 응답 항목 */
export interface LeaderRoomSummary {
  id: string;
  name: string;
  memberCount: number;
  /** 안 읽은 메시지 수 — 내가 마지막으로 읽은 뒤 다른 사람이 쓴 메시지 */
  unreadCount: number;
  /** 마지막 메시지 미리보기 (없으면 null) */
  lastMessage: string | null;
  /** ISO datetime — 마지막 메시지 시각, 없으면 방 만든 시각 */
  lastActivityAt: string;
}

/** GET /leader-rooms/:roomId 응답 */
export interface LeaderRoomDetail {
  id: string;
  name: string;
  members: ChatMember[];
  /** 방 이름 수정·멤버 추가/추방·방 삭제 가능 여부 — 관리자 */
  canManage: boolean;
}

/** 리더 방에 넣을 수 있는 사람의 등급 */
export type LeaderGrade = "admin" | "teamLeader" | "cellLeader" | "viceLeader";

/** GET /leader-rooms/candidates 응답 항목 (관리자 전용) — 방 만들기·멤버 추가의 선택지 */
export interface LeaderRoomCandidate {
  id: string;
  name: string;
  avatarUrl: string | null;
  /** 가장 높은 등급 하나 — 관리자 > 팀장 > 셀장 > 부셀장 */
  grade: LeaderGrade;
  /** 소속 설명 — 팀장이면 팀 이름, 셀장·부셀장이면 셀 이름 (없으면 null) */
  affiliation: string | null;
}
