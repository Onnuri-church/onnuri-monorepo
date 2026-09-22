import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import type { JwtPayload } from '../../modules/auth/strategies/jwt.strategy';
import { PrismaService } from '../../modules/prisma/prisma.service';

// 관리자 전용 엔드포인트 가드 — JwtAuthGuard 뒤에 나란히 건다 (UseGuards(JwtAuthGuard, AdminGuard)).
// 토큰에는 sub만 있어서(isAdmin 미포함 — 승격/강등이 토큰 수명과 어긋나지 않게) 매 요청 DB를 본다.
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: JwtPayload }>();
    const userId = request.user?.sub;
    if (!userId) throw new ForbiddenException('관리자만 사용할 수 있습니다.');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });
    if (!user?.isAdmin) {
      throw new ForbiddenException('관리자만 사용할 수 있습니다.');
    }
    return true;
  }
}
