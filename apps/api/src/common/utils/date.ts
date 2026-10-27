// 화면에 그대로 찍히는 날짜 문구를 만든다 (ARCHITECTURE.md App Responsibilities —
// 보이는 문구는 프론트가 아니라 서버가 계산한다).
//
// 전부 UTC 기준으로 읽는다: Prisma가 `@db.Date` 컬럼을 UTC 자정으로 돌려주므로 KST로 읽으면
// 하루 밀린다. 반대로 말하면 시각이 들어있는 값(createdAt 등)은 toKstDate로 먼저 바꿔서 넘긴다.

export function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * 시각이 있는 값(createdAt 등)을 한국 날짜로 읽게 9시간 민다 — 결과를 이 파일의 UTC 함수에
 * 넘기면 한국 날짜가 나온다. 그대로 넘기면 자정~오전 9시(KST)에 생긴 값이 전날로 찍힌다.
 */
export function toKstDate(date: Date): Date {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000);
}

/** "2026.05.07" — 목록 카드용 */
export function toDateLabel(date: Date): string {
  return `${date.getUTCFullYear()}.${pad(date.getUTCMonth() + 1)}.${pad(date.getUTCDate())}`;
}

/** "05월 27일" — 상세 화면용 */
export function toDayLabel(date: Date): string {
  return `${pad(date.getUTCMonth() + 1)}월 ${pad(date.getUTCDate())}일`;
}

/** "2026.05" — 월 필터 값 (큐티나눔·말씀 게시판) */
export function toMonthValue(date: Date): string {
  return `${date.getUTCFullYear()}.${pad(date.getUTCMonth() + 1)}`;
}

/** "2026.05" → "26년 5월" */
export function toMonthLabel(monthValue: string): string {
  const [year, month] = monthValue.split('.');
  return `${year.slice(2)}년 ${Number(month)}월`;
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * 한국 날짜로 "오늘"을 `@db.Date` 컬럼과 비교할 수 있게 그 날짜의 UTC 자정으로 돌려준다.
 * 셀 활동기간처럼 날짜 단위로 끝나는 값은 한국 시간 자정에 넘어가야 한다 — UTC로 자르면
 * 끝나는 날 오전 9시에 바뀐다.
 */
export function kstToday(now: Date = new Date()): Date {
  return new Date(
    new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10),
  );
}
