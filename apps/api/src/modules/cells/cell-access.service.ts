import { ForbiddenException, Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

// 셀 페이지(상세·구성원·사진첩·소식) 열람 권한 — 그 셀의 진행 중 셀원 또는 관리자만 (2026-10-18 확정).
// 셀이 실제로 있는지는 호출한 쪽이 따로 확인한다 (여기서는 권한만 본다).
@Injectable()
export class CellAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCanView(userId: string, cellId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isAdmin: true,
        cellMemberships: {
          where: { cellId, endedAt: null },
          select: { id: true },
        },
      },
    });
    const isCellMember = (user?.cellMemberships.length ?? 0) > 0;
    if (!user?.isAdmin && !isCellMember) {
      throw new ForbiddenException('이 셀의 셀원만 볼 수 있습니다.');
    }
  }
}
