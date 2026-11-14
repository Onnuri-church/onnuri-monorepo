// 신고 (SCRUM-199) — 글·댓글·채팅 신고와 관리자 신고 목록.

export type ReportTargetType =
  | "POST"
  | "COMMENT"
  | "CHAT_MESSAGE"
  | "TEAM_BOARD_POST"
  | "TEAM_BOARD_COMMENT";

export type ReportReason = "ABUSE" | "SEXUAL" | "SPAM" | "PRIVACY" | "OTHER";

export type ReportStatus = "OPEN" | "HIDDEN" | "DISMISSED";

/** 신고 사유 선택지 — 앱 시트와 관리자 목록이 같은 문구를 쓴다 */
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  ABUSE: "욕설·비방",
  SEXUAL: "음란·선정적인 내용",
  SPAM: "광고·도배",
  PRIVACY: "개인정보 노출",
  OTHER: "기타",
};

/** POST /reports */
export interface CreateReportRequest {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  /** 기타 사유 (선택, 500자) */
  detail?: string;
}

/** 관리자 신고 목록 한 줄 (GET /admin/reports) */
export interface AdminReportItem {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  detail: string | null;
  /** 신고 시점 내용 앞부분 */
  snapshot: string;
  /** 신고된 글 작성자 — "작성자 이용 정지"용 (SCRUM-204) */
  targetAuthorId: string;
  targetAuthorName: string;
  /** 작성자가 지금 이용 정지 중인지 */
  targetAuthorSuspended: boolean;
  reporterName: string;
  /** 같은 글에 들어온 처리 전 신고 수 */
  openCountForTarget: number;
  status: ReportStatus;
  createdAt: string;
}

/** PATCH /admin/reports/:id — hide: 글을 숨기고 같은 글의 신고를 모두 처리, dismiss: 문제없음 */
export interface HandleReportRequest {
  action: "hide" | "dismiss";
}
