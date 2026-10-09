/**
 * 홈 배너 (Notice type=BANNER) API 계약.
 * 활성 배너 = 가장 최근 등록 1건. 내리기 = 삭제 — 그러면 이전 배너가 다시 표시된다.
 */

export interface HomeBanner {
  id: string;
  /** 말씀 제목 */
  title: string;
  /** 성경 구절 (예: "마태복음 6:5-8") — 말씀/포스터 배너를 통합하기 전에 포스터로 올린 옛 배너만 null */
  passage: string | null;
  /** "9월 설교 시리즈" — 등록 월로 서버가 만든다 */
  seriesLabel: string;
  /** 배경사진(선택) — 없으면 회색 배경에 글만 올라간다 */
  imageUrl: string | null;
  /** 홈에 표시 중인 배너 — 한 번에 하나만 true. 전부 false면 앱이 기본 배너로 폴백 */
  isActive: boolean;
  /** ISO datetime */
  createdAt: string;
}

/** PUT /notices/banners/:id/active 요청 본문 (관리자 전용, 응답은 HomeBanner) — true면 다른 배너는 자동으로 꺼진다 */
export interface SetHomeBannerActiveRequest {
  active: boolean;
}

/** POST /notices/banners 요청 본문 (관리자 전용, 응답은 HomeBanner) */
export interface CreateHomeBannerRequest {
  title: string;
  passage: string;
  /** 배경사진(선택) — POST /uploads가 돌려준 주소 */
  imageUrl?: string;
}

/** PATCH /notices/banners/:id 요청 본문 (관리자 전용, 응답은 HomeBanner) — 보낸 필드만 바꾼다.
 *  배경사진은 imageUrl: null로 지울 수 있다. */
export interface UpdateHomeBannerRequest {
  title?: string;
  passage?: string;
  imageUrl?: string | null;
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
