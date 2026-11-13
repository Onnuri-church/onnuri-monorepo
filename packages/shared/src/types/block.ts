// 사용자 차단 (SCRUM-198) — 설정 > 차단 목록 한 줄.
export interface BlockedUser {
  userId: string;
  name: string;
  avatarUrl: string | null;
  /** 차단한 시각 (ISO) */
  blockedAt: string;
}
