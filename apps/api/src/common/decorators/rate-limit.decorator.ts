import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitRule {
  /** 같은 이름끼리 한 통을 쓴다 — 핸들러가 달라도 같은 규칙이면 횟수를 합친다 */
  name: string;
  limit: number;
  windowMs: number;
}

const MINUTE = 60 * 1000;

// 요청 횟수 제한 규칙 (SCRUM-165). 사람이 앱을 쓰는 속도로는 닿지 않을 만큼 넉넉하게 잡고,
// 스크립트로 몰아치는 요청·앱이 고장 나 반복 호출하는 경우만 끊는다.
export const RATE_LIMITS = {
  // 모든 요청 — 로그인한 사람은 사람 단위, 아니면 IP 단위. 채팅 폴링(3초)과 화면 이동을 겹쳐도
  // 분당 수십 번 수준이라 300이면 충분히 남는다.
  default: { name: 'default', limit: 300, windowMs: MINUTE },
  // 로그인·토큰 갱신 — 토큰이 없으니 IP 단위. 주일에 교회 와이파이(같은 IP)로 여럿이
  // 한꺼번에 로그인해도 걸리지 않게 60으로 둔다.
  auth: { name: 'auth', limit: 60, windowMs: MINUTE },
  // 사진 업로드 — 한 번에 여러 장을 올려도 분당 30장이면 넉넉하다. 저장소 용량을 지키는 몫.
  upload: { name: 'upload', limit: 30, windowMs: MINUTE },
} satisfies Record<string, RateLimitRule>;

/** 기본 규칙 대신 이 규칙을 쓴다 (컨트롤러 또는 핸들러에 붙인다). */
export const RateLimit = (rule: RateLimitRule) =>
  SetMetadata(RATE_LIMIT_KEY, rule);
