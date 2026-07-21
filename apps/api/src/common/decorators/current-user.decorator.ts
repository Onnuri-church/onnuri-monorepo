import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { JwtPayload } from '../../modules/auth/strategies/jwt.strategy';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
    return request.user;
  },
);
