import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { JwtPayload } from '../../modules/auth/strategies/jwt.strategy';
import { PrismaService } from '../../modules/prisma/prisma.service';

// 관리자가 팀 단위로 열어 주는 콘텐츠 권한 — Team 컬럼과 1:1이다.
export type ContentPermission = 'canUploadBulletin' | 'canManageBanner';

export const REQUIRED_CONTENT_PERMISSION = 'requiredContentPermission';
export const RequireContentPermission = (permission: ContentPermission) =>
  SetMetadata(REQUIRED_CONTENT_PERMISSION, permission);

// 관리자이거나, 그 권한이 켜진 팀의 현재 팀원(팀장 포함)이면 통과한다.
// JwtAuthGuard 뒤에 나란히 건다: @UseGuards(JwtAuthGuard, ContentManagerGuard).
// AdminGuard처럼 매 요청 DB를 본다 — 팀원 변동·권한 토글이 토큰 수명과 어긋나지 않게.
@Injectable()
export class ContentManagerGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.get<ContentPermission | undefined>(
      REQUIRED_CONTENT_PERMISSION,
      context.getHandler(),
    );
    const request = context
      .switchToHttp()
      .getRequest<{ user?: JwtPayload }>();
    const userId = request.user?.sub;
    if (!permission || !userId) {
      throw new ForbiddenException('권한이 없습니다.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });
    if (user?.isAdmin) return true;

    const granted = await this.prisma.teamMembership.count({
      where: {
        userId,
        endedAt: null,
        team: { deletedAt: null, [permission]: true },
      },
    });
    if (granted === 0) {
      throw new ForbiddenException('업로드 권한이 있는 팀의 팀원만 사용할 수 있습니다.');
    }
    return true;
  }
}
