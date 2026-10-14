/**
 * 말씀 게시판 (설교영상) API 계약.
 * 영상은 앱에서 등록하지 않는다 — 서버가 교회 유튜브 채널에서 주기적으로 가져온다.
 * 예배 하루에 설교 1건이다. 방송이 끊겨 같은 날짜 영상이 둘이면 나중 것만 남는다.
 */

export interface SermonVideo {
  id: string;
  /** YouTube videoId — 플레이어 임베드용 */
  videoId: string;
  /** "마태복음 6장 8-9절ㅣ나를 따르라 #21 누군지를 알아야 하지" — 본문이 없는 회차는 제목만 */
  title: string;
  /** 설교자. 영상 제목에 없는 회차가 있어 빈 문자열일 수 있다. */
  preacher: string;
  /** "2026.08.30" */
  date: string;
  /** "주일 4부 예배" */
  serviceName: string;
  /** "2026.08.30 (일) 오후 2:01" — 방송 시작 시각(KST) */
  dateTimeLabel: string;
  thumbnailUrl: string | null;
  /** 동시 시청자수 "10K" — 라이브 중일 때만 있다 (지난 영상은 조회수를 보여주지 않는다) */
  viewCount: string | null;
  /** 지금 라이브 중인 영상 */
  isLive: boolean;
}

export interface SermonMonth {
  /** "2026.08" — 목록 조회의 month 파라미터로 그대로 되돌려준다 */
  value: string;
  /** "26년 8월" */
  label: string;
}

/** GET /sermons?month=YYYY.MM */
export interface SermonListResponse {
  months: SermonMonth[];
  /** 서버가 실제로 고른 달. 요청한 month에 영상이 없으면 최신 달로 바뀌므로, 화면은
   *  요청값이 아니라 이 값을 선택 상태로 표시한다 (영상이 하나도 없으면 null). */
  selectedMonth: string | null;
  items: SermonVideo[];
}
