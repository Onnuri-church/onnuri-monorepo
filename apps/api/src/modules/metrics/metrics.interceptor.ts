import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

import { isReviewViewer } from '../../common/review/review-scope';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { MetricsRecorderService } from './metrics-recorder.service';

// 요청 수·응답 시간과 '오늘 쓴 사람'을 센다 (SCRUM-249·250). 가장 바깥 인터셉터로 걸어서
// 횟수 제한(429)·중복 방지로 끝난 요청까지 포함한 실제 응답 시간을 잰다.
// 라우트 가드(JwtAuthGuard) 뒤에 돌아서 로그인한 요청은 req.user가 채워져 있다.
// 가드에서 끝난 요청(401)과 없는 주소(404)는 인터셉터까지 오지 않아 세지 않는다.
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly recorder: MetricsRecorderService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // e2e가 개발 DB에 테스트 요청을 쌓지 않게 끈다 (지표 테스트만 다시 켠다).
    if (process.env.METRICS_DISABLED === 'true') return next.handle();
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest<Request & { user?: JwtPayload }>();
    const res = http.getResponse<Response>();
    const startedAt = Date.now();
    // 주소 틀("/posts/:id")로 모은다 — 실제 주소로 모으면 글마다 줄이 생기고 id가 지표에 남는다.
    const route =
      (req.route as { path?: string } | undefined)?.path ?? 'unknown';

    // 심사용 계정의 사용은 활성 사용자에 넣지 않는다.
    if (req.user?.sub && !isReviewViewer()) {
      this.recorder.recordActivity(req.user.sub);
    }

    const record = (status: number) =>
      this.recorder.recordRequest(
        req.method,
        route,
        status,
        Date.now() - startedAt,
      );
    return next.handle().pipe(
      tap({
        next: () => undefined,
        complete: () => record(res.statusCode),
        error: (error: unknown) =>
          record(error instanceof HttpException ? error.getStatus() : 500),
      }),
    );
  }
}
