// DB 스키마(apps/api/prisma/schema.prisma)의 Post·게시판 enum을 따른다. 게시판별 고유 필드
// (익명 여부, 공개기간, 모집 상태 등)는 1:1 확장 테이블 소관이라 각 API DTO에서 내려준다.

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
