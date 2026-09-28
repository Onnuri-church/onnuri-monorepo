/**
 * 홈 배너 (Notice type=BANNER) API 계약.
 * 활성 배너 = 가장 최근 등록 1건. 내리기 = 삭제 — 그러면 이전 배너가 다시 표시된다.
 */

export type HomeBannerKind = "SERMON" | "POSTER";

export interface HomeBanner {
  id: string;
  /** 구절(passage)이 있으면 SERMON, 없으면 POSTER — 서버가 판별해서 내려준다 */
  kind: HomeBannerKind;
  /** SERMON: 말씀 제목 / POSTER: 관리 목록에 보이는 이름 (예: "여름 수련회") */
  title: string;
  /** SERMON형 성경 구절 (예: "마태복음 6:5-8") — POSTER형은 null */
  passage: string | null;
  /** SERMON형 "9월 설교 시리즈" — 등록 월로 서버가 만든다. POSTER형은 null */
  seriesLabel: string | null;
  /** POSTER형 포스터 이미지(필수) / SERMON형 배경사진(선택) */
  imageUrl: string | null;
  /** ISO datetime */
  createdAt: string;
}

/** POST /notices/banners 요청 본문 (관리자 전용, 응답은 HomeBanner) */
export interface CreateHomeBannerRequest {
  title: string;
  /** SERMON형이면 필수 */
  passage?: string;
  /** POSTER형이면 필수, SERMON형이면 배경사진(선택) — POST /uploads가 돌려준 주소 */
  imageUrl?: string;
}

// ── 공지사항 (Notice type=NOTICE — 마이페이지 공지사항 메뉴) ─────────────────

/** GET /notices 응답 항목 — 공지 수가 적어 목록이 전체 필드를 내려주고 상세는 캐시를 쓴다 */
export interface NoticeInfo {
  id: string;
  title: string;
  /** 본문 — 이미지만 있는 공지면 null */
  content: string | null;
  /** 첨부 이미지 (포스터 등) */
  imageUrl: string | null;
  /** ISO datetime — 표시 문구("2026.09.28")는 앱이 조립한다 */
  createdAt: string;
}

/** POST /notices 요청 본문 (관리자 전용, 응답은 NoticeInfo) — 내용이나 이미지 중 하나는 필요 */
export interface CreateNoticeRequest {
  title: string;
  content?: string;
  imageUrl?: string;
}
