import { toDateLabel, toDayLabel, toKstDate } from './date';

// 시각이 있는 값(createdAt)은 한국 날짜로 찍혀야 한다 — 자정~오전 9시(KST)가 경계.
describe('toKstDate', () => {
  it('한국 시간 새벽에 생긴 값도 그날 날짜로 읽는다', () => {
    // 2026-10-27 00:30 KST = 2026-10-26 15:30 UTC
    const createdAt = new Date('2026-10-26T15:30:00Z');
    expect(toDateLabel(toKstDate(createdAt))).toBe('2026.10.27');
    expect(toDayLabel(toKstDate(createdAt))).toBe('10월 27일');
  });

  it('한국 시간 자정 직전은 아직 그날이다', () => {
    // 2026-10-26 23:59 KST = 2026-10-26 14:59 UTC
    expect(toDateLabel(toKstDate(new Date('2026-10-26T14:59:00Z')))).toBe(
      '2026.10.26',
    );
  });

  it('연말 자정을 넘기면 해가 바뀐다', () => {
    // 2027-01-01 00:10 KST = 2026-12-31 15:10 UTC
    expect(toDateLabel(toKstDate(new Date('2026-12-31T15:10:00Z')))).toBe(
      '2027.01.01',
    );
  });
});
