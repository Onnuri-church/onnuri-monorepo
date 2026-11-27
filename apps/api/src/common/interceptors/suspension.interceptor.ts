import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable } from 'rxjs';

import type { AuthUser } from '../../modules/auth/strategies/jwt.strategy';
import { BLOCK_SUSPENDED_KEY } from '../decorators/block-suspended.decorator';
import {
  isSuspended,
  SUSPENDED_CODE,
  suspensionLabel,
} from '../utils/suspension';

// @BlockSuspended가 붙은 핸들러에서 이용 정지된 사람을 막는다 (SCRUM-204). 가드가 아니라
// 인터셉터인 이유: 전역 가드는 컨트롤러의 JwtAuthGuard보다 먼저 돌아 아직 user가 없다.
// 응답의 code로 앱이 "이용이 제한된 계정" 안내를 띄운다.
// 정지 기한은 JwtStrategy가 읽어 둔 값을 쓴다 — 여기서 User를 다시 읽지 않는다 (SCRUM-286).
@Injectable()
export class SuspensionInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const blocked = this.reflector.getAllAndOverride<boolean>(
      BLOCK_SUSPENDED_KEY,
      [context.getHandler(), context.getClass()],
    );
    const user = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>().user;
    if (!blocked || !user) return next.handle();

    if (isSuspended(user.suspendedUntil)) {
      throw new ForbiddenException({
        statusCode: 403,
        code: SUSPENDED_CODE,
        message: `이용이 제한된 계정이에요 (${suspensionLabel(user.suspendedUntil)}). 글·댓글·채팅을 쓸 수 없어요.`,
      });
    }
    return next.handle();
  }
}
