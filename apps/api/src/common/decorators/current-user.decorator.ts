import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { JwtPayload } from '../../modules/auth/strategies/jwt.strategy';

// OptionalJwtAuthGuard 뒤에서는 게스트일 수 있으므로 undefined가 나온다 —
// 해당 컨트롤러는 파라미터를 `user: JwtPayload | undefined`로 받는다.
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): JwtPayload | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: JwtPayload }>();
    return request.user;
  },
);
