import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import type { AuthUser } from '../../modules/auth/strategies/jwt.strategy';

// 관리자 전용 엔드포인트 가드 — JwtAuthGuard 뒤에 나란히 건다 (UseGuards(JwtAuthGuard, AdminGuard)).
// 토큰에는 sub만 있다(isAdmin 미포함 — 승격/강등이 토큰 수명과 어긋나지 않게).
// 관리자 여부는 JwtStrategy가 요청마다 DB에서 읽어 둔 값을 쓴다 — 여기서 다시 읽지 않는다 (SCRUM-286).
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!request.user?.isAdmin) {
      throw new ForbiddenException('관리자만 사용할 수 있습니다.');
    }
    return true;
  }
}
