/**
 * 주보·나눔지 API 계약.
 * 별도 테이블 없이 그 주 예배 회차(WorshipService)에 붙은 이미지(Image kind=BULLETIN/HANDOUT)다.
 * 그래서 id는 예배 회차 id이고, 한 날짜에 한 건이다.
 */

export interface BulletinListItem {
  id: string;
  /** "2026.06.01 (일)" */
  dateLabel: string;
  /** 같은 날 설교 제목 — 설교영상이 아직 안 올라왔으면 null */
  title: string | null;
}

export interface BulletinMonth {
  /** "2026.06" — 목록 조회의 month 파라미터로 그대로 되돌려준다 */
  value: string;
  /** "26년 6월" */
  label: string;
}

/** GET /bulletins?month=YYYY.MM */
export interface BulletinListResponse {
  months: BulletinMonth[];
  /** 서버가 실제로 고른 달. 요청한 month에 주보가 없으면 최신 달로 바뀌므로, 화면은
   *  요청값이 아니라 이 값을 선택 상태로 표시한다 (주보가 하나도 없으면 null). */
  selectedMonth: string | null;
  items: BulletinListItem[];
}

export interface BulletinImage {
  id: string;
  url: string;
}

/** GET /bulletins/:id — 주보 상세와 나눔지 화면이 같이 쓴다 */
export interface BulletinDetail {
  id: string;
  dateLabel: string;
  title: string | null;
  /** 주보 앞·뒤 2장 (순서대로) */
  bulletinImages: BulletinImage[];
  /** 나눔지 1~5장 (순서대로) */
  handoutImages: BulletinImage[];
}

/** POST /bulletins 요청 본문 (관리자 전용, 응답은 BulletinDetail) */
export interface CreateBulletinRequest {
  /** "2026-06-01" */
  date: string;
  /** POST /uploads가 돌려준 주소 — 정확히 2장 */
  bulletinImageUrls: string[];
  /** POST /uploads가 돌려준 주소 — 1~5장 */
  handoutImageUrls: string[];
}
