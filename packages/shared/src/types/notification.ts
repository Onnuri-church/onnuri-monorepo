/**
 * 알림센터 (Notification) API 계약.
 * 푸시 발송 전 단계 — 서버가 이벤트 시점에 행을 쌓고 앱이 알림센터에서 읽는다.
 */

export type NotificationType =
  | "FOLLOWER_NOTE"
  | "SERMON_UPLOAD"
  | "LIVE_START"
  | "QT_NEW"
  | "COMMENT"
  | "LIKE"
  | "NOTICE"
  | "GROUP_MEETING";

/** GET /notifications 응답 항목 — 최신순 */
/** PATCH·DELETE /users/me/push-token 요청 본문 — 기기의 Expo 푸시 토큰 */
export interface RegisterPushTokenRequest {
  token: string;
}

export interface NotificationInfo {
  id: string;
  type: NotificationType;
  /** 카드 상단 라벨 (예: "팔로워 노트", "공지사항") */
  title: string;
  /** 본문 한 줄 (예: "이서연 셀장님이 누리셀 팔로워 노트를 작성했어요.") */
  body: string;
  /**
   * 탭하면 이동할 앱 내부 경로 — "notice/{id}", "follower-note/{cellId}/{noteId}" 형식.
   * 앱의 NotificationScreen이 파싱해 네비게이션한다. null이면 이동 없음.
   */
  linkUrl: string | null;
  isRead: boolean;
  /** ISO datetime — "방금 전" 같은 상대 표기는 앱이 조립한다 (utils/date의 toTimeAgo) */
  createdAt: string;
}
