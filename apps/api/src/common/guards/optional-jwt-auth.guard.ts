import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

// 게스트 허용 엔드포인트용. 토큰이 없으면 req.user 없이 통과시키고(게스트),
// 토큰이 있는데 무효(만료 포함)면 401을 낸다 — 만료를 게스트로 조용히 처리하면
// 클라이언트가 세션이 끊긴 것을 알아채지 못하기 때문이다.
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.headers.authorization) return true;
    return super.canActivate(context);
  }
}
