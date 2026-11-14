import { toDateLabel, toKstDate } from './date';

// 이용 정지 (SCRUM-204). 정지된 사람은 글·댓글·채팅·사진을 새로 쓰거나 고칠 수 없고, 읽기는 그대로다.
// 기간을 정하면 그 시각에 자동으로 풀리고, "해제할 때까지"는 아주 먼 날짜로 둔다 (칸 하나로 처리).
export const INDEFINITE_SUSPENSION = new Date('9999-12-31T00:00:00.000Z');

export const SUSPENDED_CODE = 'USER_SUSPENDED';

export function isSuspended(
  until: Date | null | undefined,
  now: Date = new Date(),
): until is Date {
  return !!until && until.getTime() > now.getTime();
}

/** "2026.11.21까지" / "해제할 때까지" */
export function suspensionLabel(until: Date): string {
  return until.getTime() >= INDEFINITE_SUSPENSION.getTime()
    ? '해제할 때까지'
    : `${toDateLabel(toKstDate(until))}까지`;
}
