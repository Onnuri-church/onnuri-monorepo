// 취향 소그룹 모임 (README "취향 소그룹 모임 게시판"). 모임 카드 목록에 필요한 필드만 정의한다.
export type GroupMeetingStatus = "open" | "closed";

export interface GroupMeeting {
  id: string;
  /** 모임 카테고리 (예: "맛집 탐방") */
  category: string;
  title: string;
  /** 모집 마감일 (ISO 8601 날짜, 예: "2026-07-31") */
  deadline: string;
  status: GroupMeetingStatus;
  /** 카드 배지에 그대로 표시하는 상태 문구 (예: "모집중") — 사용자에게 보이는 상태 문구는 API가 계산해 내려준다 */
  statusLabel: string;
  thumbnailUrl: string | null;
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
  /** 화면에 그대로 찍는 표시용 문자열 (예: "2분 전") — 서버가 계산한다 */
  timeAgo: string;
  content: string;
}

// 상세 페이지. 목록(GroupMeeting)에 없는 필드만 더한다.
export interface GroupMeetingDetail extends GroupMeeting {
  /** 모집 기간 표시용 (예: "7/1 ~ 7/28") */
  periodLabel: string;
  heroImageUrl: string | null;
  /** 정보 상자에 순서대로 그리는 행 (모임일·장소·비용) */
  schedule: string;
  place: string;
  cost: string;
  photos: GroupMeetingPhoto[];
  /** photos에 다 담기지 않은 것까지 포함한 전체 장수 */
  photoCount: number;
  comments: GroupMeetingComment[];
}
