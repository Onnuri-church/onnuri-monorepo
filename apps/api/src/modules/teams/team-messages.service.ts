import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { TeamMessageInfo } from '@onnuri/shared';

import { PrismaService } from '../prisma/prisma.service';

// 처음 열 때 받는 최근 메시지 수 — 그 이전은 지금 단계에서 불러오지 않는다.
const RECENT_LIMIT = 100;

// 팀 단톡 — 그 팀 팀원과 관리자만 읽고 쓴다. 실시간 푸시 대신 앱이 `after`로 새 메시지만
// 주기적으로 받아간다.
@Injectable()
export class TeamMessagesService {
  constructor(private readonly prisma: PrismaService) {}

  // after(ISO)가 없으면 최근 RECENT_LIMIT건, 있으면 그 이후 메시지. 둘 다 오래된 순으로 준다.
  async find(
    requesterId: string,
    teamId: string,
    after?: string,
  ): Promise<TeamMessageInfo[]> {
    const isAdmin = await this.assertCanAccess(requesterId, teamId);
    const afterDate = after ? new Date(after) : undefined;

    const rows = await this.prisma.teamMessage.findMany({
      where: {
        teamId,
        deletedAt: null,
        ...(afterDate && !Number.isNaN(afterDate.getTime())
          ? { createdAt: { gt: afterDate } }
          : {}),
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        authorId: true,
        author: { select: { name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: afterDate ? 'asc' : 'desc' },
      take: RECENT_LIMIT,
    });
    const ordered = afterDate ? rows : rows.reverse();
    return ordered.map((row) => this.toInfo(row, requesterId, isAdmin));
  }

  async create(
    requesterId: string,
    teamId: string,
    content: string,
  ): Promise<TeamMessageInfo> {
    const isAdmin = await this.assertCanAccess(requesterId, teamId);
    const row = await this.prisma.teamMessage.create({
      data: { teamId, authorId: requesterId, content: content.trim() },
      select: {
        id: true,
        content: true,
        createdAt: true,
        authorId: true,
        author: { select: { name: true, avatarUrl: true } },
      },
    });
    return this.toInfo(row, requesterId, isAdmin);
  }

  // 내 메시지 또는 관리자만 지울 수 있다 (soft delete).
  async remove(
    requesterId: string,
    teamId: string,
    messageId: string,
  ): Promise<void> {
    const isAdmin = await this.assertCanAccess(requesterId, teamId);
    const message = await this.prisma.teamMessage.findFirst({
      where: { id: messageId, teamId, deletedAt: null },
      select: { authorId: true },
    });
    if (!message) throw new NotFoundException('메시지를 찾을 수 없습니다.');
    if (message.authorId !== requesterId && !isAdmin) {
      throw new ForbiddenException('내가 보낸 메시지만 삭제할 수 있습니다.');
    }
    await this.prisma.teamMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });
  }

  // 팀원이거나 관리자면 통과하고, 관리자 여부를 돌려준다.
  private async assertCanAccess(
    requesterId: string,
    teamId: string,
  ): Promise<boolean> {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, deletedAt: null },
      select: { id: true },
    });
    if (!team) throw new NotFoundException('존재하지 않는 팀입니다.');

    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: {
        isAdmin: true,
        teamMemberships: {
          where: { teamId, endedAt: null },
          select: { id: true },
        },
      },
    });
    const isAdmin = requester?.isAdmin === true;
    if (!isAdmin && (requester?.teamMemberships.length ?? 0) === 0) {
      throw new ForbiddenException('이 팀의 팀원만 볼 수 있습니다.');
    }
    return isAdmin;
  }

  private toInfo(
    row: {
      id: string;
      content: string;
      createdAt: Date;
      authorId: string;
      author: { name: string; avatarUrl: string | null };
    },
    requesterId: string,
    isAdmin: boolean,
  ): TeamMessageInfo {
    const isMine = row.authorId === requesterId;
    return {
      id: row.id,
      authorName: row.author.name,
      authorAvatarUrl: row.author.avatarUrl,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
      isMine,
      canDelete: isMine || isAdmin,
    };
  }
}
