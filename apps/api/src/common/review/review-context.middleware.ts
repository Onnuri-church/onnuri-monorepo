import { Injectable, type NestMiddleware } from '@nestjs/common';

import { reviewContext } from './review-scope';

// 요청마다 빈 컨텍스트를 연다 — 로그인 검증(JwtStrategy)이 심사 계정이면 표시한다.
@Injectable()
export class ReviewContextMiddleware implements NestMiddleware {
  use(_req: unknown, _res: unknown, next: () => void) {
    reviewContext.run({ isReviewer: false }, next);
  }
}
