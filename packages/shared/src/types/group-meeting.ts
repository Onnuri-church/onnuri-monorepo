// 취향 소그룹 모임 (README "취향 소그룹 모임 게시판") — HobbyGroup(포스트 1:1 확장) 기반.
// 참여는 승인제(PENDING/APPROVED/REJECTED), 소그룹장은 생성 폼에서 한 명 이상 지정 (2026-09-21).
import type { HobbyGroupMemberStatus } from "./post";

export type GroupMeetingStatus = "open" | "closed";

export interface GroupMeeting {
  /** postId — 댓글·좋아요 등 게시판 공용 API도 이 id를 쓴다 */
  id: string;
  title: string;
  /** 모집 마감일 (ISO 8601 날짜) — 옛 데이터는 비어 있을 수 있다 */
  deadline: string | null;
  status: GroupMeetingStatus;
  /** 카드 배지에 그대로 표시하는 상태 문구 (예: "모집중") — 사용자에게 보이는 상태 문구는 API가 계산해 내려준다 */
  statusLabel: string;
  thumbnailUrl: string | null;
  /** 승인된(APPROVED) 참여자 수 — 소그룹장 포함 */
  participantCount: number;
  /** 카드에 겹쳐 보여줄 참여자 프로필. 전체가 아니라 앞쪽 몇 명만 내려준다 (전체 수는 participantCount). */
  participantAvatarUrls: string[];
}

export interface GroupMeetingPhoto {
  id: string;
  url: string;
  /** 사진 위에 겹쳐 보여줄 설명 (예: "여름 수련회 찬양 · 7월") */
  caption: string | null;
}

export interface GroupMeetingComment {
  id: string;
  authorName: string;
  authorAvatarUrl: string | null;
  /** 작성 시각(ISO) — "2분 전"은 앱이 계산한다 (캐시에 굳지 않게) */
  createdAt: string;
  content: string;
}

export interface GroupMeetingMember {
  /** userId */
  id: string;
  name: string;
}

// 상세 페이지. 목록(GroupMeeting)에 없는 필드만 더한다.
export interface GroupMeetingDetail extends GroupMeeting {
  /** 소개 글 (생성 폼의 설명문) */
  description: string;
  /** 모집 시작일 (YYYY-MM-DD) — 편집 폼 프리필용 (마감일은 deadline) */
  recruitStart: string | null;
  /** 모집 기간 표시용 (예: "7/1 ~ 7/28") */
  periodLabel: string;
  heroImageUrl: string | null;
  /** 정보 상자에 순서대로 그리는 행 (모임일·장소·비용) — 미입력은 "미정" */
  schedule: string;
  place: string;
  cost: string;
  leaders: GroupMeetingMember[];
  photos: GroupMeetingPhoto[];
  /** photos에 다 담기지 않은 것까지 포함한 전체 장수 */
  photoCount: number;
  comments: GroupMeetingComment[];
  /** 로그인한 나의 참여 상태 — 게스트·미신청이면 null */
  myStatus: HobbyGroupMemberStatus | null;
  /** 관리자 또는 이 소그룹의 소그룹장 — 편집·삭제·승인 UI 노출 기준 */
  canManage: boolean;
  /** canManage일 때만 채워지는 승인 대기(PENDING) 신청자 목록 */
  pendingMembers: GroupMeetingMember[];
}

/** POST /group-meetings 요청 본문 (관리자 전용, 응답은 GroupMeetingDetail) */
export interface CreateGroupMeetingRequest {
  title: string;
  description: string;
  /** YYYY-MM-DD */
  recruitStart: string;
  recruitEnd: string;
  place: string;
  cost: string;
  /** 소그룹장 — 한 명 이상, 다중 가능 (2026-09-21 확정). 자동으로 APPROVED가 된다 */
  leaderIds: string[];
}

/** PATCH /group-meetings/:id 요청 본문 — 보낸 필드만 반영. leaderIds는 전체 교체 (빠진 사람은 일반 참여자로 남는다) */
export interface UpdateGroupMeetingRequest {
  title?: string;
  description?: string;
  recruitStart?: string;
  recruitEnd?: string;
  place?: string;
  cost?: string;
  status?: GroupMeetingStatus;
  leaderIds?: string[];
}
