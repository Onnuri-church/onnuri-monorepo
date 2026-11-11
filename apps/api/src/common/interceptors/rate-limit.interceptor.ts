import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';

import {
  RATE_LIMIT_KEY,
  RATE_LIMITS,
  type RateLimitRule,
} from '../decorators/rate-limit.decorator';

const PURGE_THRESHOLD = 5000;

interface Counter {
  count: number;
  resetAt: number;
}

// 요청 횟수 제한 (SCRUM-165) — 고정 창(분 단위) 카운터.
// 가드가 아니라 인터셉터인 이유: 인터셉터는 라우트 가드(JwtAuthGuard) 뒤에 돌아서 req.user가
// 채워져 있다. 그래서 로그인한 요청은 IP가 아니라 사람 단위로 센다 — 교회 와이파이처럼 여럿이
// 한 IP를 나눠 써도 서로의 횟수를 깎지 않는다. 토큰이 틀린 요청은 가드에서 이미 401로 끝난다.
// 서버가 한 대(Render 단일 인스턴스)라 메모리에 둔다 (DedupeCreateInterceptor와 같은 결).
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly counters = new Map<string, Counter>();

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // e2e는 한 IP에서 수백 번 요청한다 — 테스트 설정에서 끈다 (이 기능 자체의 테스트만 다시 켠다).
    if (process.env.RATE_LIMIT_DISABLED === 'true') return next.handle();
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const request = http.getRequest<Request & { user?: { sub?: string } }>();
    const rule =
      this.reflector.getAllAndOverride<RateLimitRule | undefined>(
        RATE_LIMIT_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? RATE_LIMITS.default;

    const userId = request.user?.sub;
    const who = userId ? `u:${userId}` : `ip:${request.ip ?? 'unknown'}`;
    const key = `${rule.name}|${who}`;

    const now = Date.now();
    this.purgeExpired(now);
    const counter = this.counters.get(key);
    if (!counter || counter.resetAt <= now) {
      this.counters.set(key, { count: 1, resetAt: now + rule.windowMs });
      return next.handle();
    }

    counter.count += 1;
    if (counter.count > rule.limit) {
      const retryAfterSec = Math.ceil((counter.resetAt - now) / 1000);
      http
        .getResponse<Response>()
        .setHeader('Retry-After', String(retryAfterSec));
      throw new HttpException(
        '요청이 너무 많아요. 잠시 후 다시 시도해주세요.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return next.handle();
  }

  private purgeExpired(now: number) {
    if (this.counters.size < PURGE_THRESHOLD) return;
    for (const [key, counter] of this.counters) {
      if (counter.resetAt <= now) this.counters.delete(key);
    }
  }
}
