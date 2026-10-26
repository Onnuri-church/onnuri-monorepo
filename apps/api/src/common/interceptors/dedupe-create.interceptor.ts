import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'crypto';
import type { Request } from 'express';
import { from, lastValueFrom, Observable } from 'rxjs';

import { DEDUPE_CREATE_KEY } from '../decorators/dedupe-create.decorator';

// 같은 요청이 다시 와도 이 시간 안이면 새로 만들지 않는다. 오류 안내를 읽고 다시 누르는
// 시간(길어야 몇 분)을 덮되, 같은 제목·내용을 일부러 다시 올리는 경우는 거의 없는 길이.
const WINDOW_MS = 5 * 60 * 1000;
const PURGE_THRESHOLD = 500;

interface Entry {
  expiresAt: number;
  result: Promise<unknown>;
}

// 서버가 한 대(Render 단일 인스턴스)라 메모리에 둔다 — 재시작하면 비워지지만 그 사이의
// 재시도만 놓칠 뿐 잘못 막는 경우는 없다. 진행 중인 요청도 같은 결과를 기다리게 해서
// 동시에 두 번 들어온 요청도 한 번만 처리한다.
@Injectable()
export class DedupeCreateInterceptor implements NestInterceptor {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!this.reflector.get<boolean>(DEDUPE_CREATE_KEY, context.getHandler())) {
      return next.handle();
    }
    const request = context.switchToHttp().getRequest<
      Request & { user?: { sub?: string } }
    >();
    const userId = request.user?.sub;
    if (!userId) return next.handle();

    const now = Date.now();
    this.purgeExpired(now);

    const key = createHash('sha256')
      .update(
        `${userId}|${request.method}|${request.originalUrl}|${JSON.stringify(request.body ?? {})}`,
      )
      .digest('hex');
    const existing = this.entries.get(key);
    if (existing && existing.expiresAt > now) return from(existing.result);

    const result = lastValueFrom(next.handle());
    this.entries.set(key, { expiresAt: now + WINDOW_MS, result });
    // 실패한 요청은 기억하지 않는다 — 다시 시도하면 새로 처리돼야 한다.
    result.catch(() => this.entries.delete(key));
    return from(result);
  }

  private purgeExpired(now: number) {
    if (this.entries.size < PURGE_THRESHOLD) return;
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(key);
    }
  }
}
