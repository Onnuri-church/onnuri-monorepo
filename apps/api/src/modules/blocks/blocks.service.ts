import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { BlockedUser } from '@onnuri/shared';

import { visibleUserWhere } from '../../common/review/review-scope';
import { PrismaService } from '../prisma/prisma.service';

// 사용자 차단 (SCRUM-198). 차단하면 차단한 사람에게만 상대의 글·댓글이 서버에서 빠지고
// (common/review/review-scope.ts visibleAuthorWhere), 채팅은 앱이 이 목록으로 접어 보여준다.
// 상대에게는 알리지 않고, 같은 팀·셀·소그룹 소속도 그대로 둔다.
@Injectable()
export class BlocksService {
  constructor(private readonly prisma: PrismaService) {}

  async findMine(userId: string): Promise<BlockedUser[]> {
    const rows = await this.prisma.userBlock.findMany({
      where: { blockerId: userId },
      select: {
        createdAt: true,
        blocked: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => ({
      userId: row.blocked.id,
      name: row.blocked.name,
      avatarUrl: row.blocked.avatarUrl,
      blockedAt: row.createdAt.toISOString(),
    }));
  }

  // 이미 차단했으면 그대로 성공 — 두 번 눌러도 에러가 나지 않게.
  async block(userId: string, targetId: string): Promise<void> {
    if (userId === targetId) {
      throw new BadRequestException('나 자신은 차단할 수 없어요.');
    }
    const target = await this.prisma.user.findFirst({
      where: { id: targetId, ...visibleUserWhere() },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('회원을 찾을 수 없습니다.');
    await this.prisma.userBlock.upsert({
      where: {
        blockerId_blockedId: { blockerId: userId, blockedId: targetId },
      },
      update: {},
      create: { blockerId: userId, blockedId: targetId },
    });
  }

  async unblock(userId: string, targetId: string): Promise<void> {
    await this.prisma.userBlock.deleteMany({
      where: { blockerId: userId, blockedId: targetId },
    });
  }
}
