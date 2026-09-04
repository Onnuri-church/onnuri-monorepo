import type { BoardType, PrayerCategory } from "../types/post";

export const BOARD_TYPES = [
  "QT_SHARE",
  "CELL_NEWS",
  "TEAM_ACTIVITY",
  "HOBBY_GROUP",
  "PRAYER",
] as const satisfies readonly BoardType[];

export const USER_ROLES = ["member", "team_leader", "admin"] as const;

/** 기도제목 카테고리의 표시 라벨 — 값은 서버 enum 그대로 쓰고 문구만 여기서 매핑한다. */
export const PRAYER_CATEGORY_LABELS: Record<PrayerCategory, string> = {
  PERSONAL_SPIRITUAL: "개인 및 영성",
  HEALTH_DAILY: "건강 및 일상",
  RELATIONSHIP_COMMUNITY: "관계 및 공동체",
  INTERCESSION_SERVICE: "중보 및 섬김",
  OTHER: "기타",
};

export const MAX_POST_TITLE_LENGTH = 100;
export const MAX_POST_CONTENT_LENGTH = 5000;
