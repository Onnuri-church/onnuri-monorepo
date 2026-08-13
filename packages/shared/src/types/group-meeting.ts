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
}
