// 화면에 그대로 찍히는 날짜 문구를 만든다 (ARCHITECTURE.md App Responsibilities —
// 보이는 문구는 프론트가 아니라 서버가 계산한다).
//
// 전부 UTC 기준으로 읽는다: Prisma가 `@db.Date` 컬럼을 UTC 자정으로 돌려주므로 KST로 읽으면
// 하루 밀린다. 반대로 말하면 시각이 들어있는 값(createdAt 등)에는 쓰면 안 된다.

export function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** "2026.05.07" — 목록 카드용 */
export function toDateLabel(date: Date): string {
  return `${date.getUTCFullYear()}.${pad(date.getUTCMonth() + 1)}.${pad(date.getUTCDate())}`;
}

/** "05월 27일" — 상세 화면용 */
export function toDayLabel(date: Date): string {
  return `${pad(date.getUTCMonth() + 1)}월 ${pad(date.getUTCDate())}일`;
}
