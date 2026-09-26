import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { TeamMemberCandidate } from '@onnuri/shared';

import { PrismaService } from '../prisma/prisma.service';

// 팀원 추가·제거 (그 팀 팀장과 관리자만 — docs/attendance-data-model.md §1 "팀장: 팀원 추가").
// 한 사람은 한 팀에만 속한다 (프로필의 소속 팀과 같은 규칙) — 다른 팀 사람을 넣으면 그 소속은 종료된다.
@Injectable()
export class TeamMembersService {
  constructor(private readonly prisma: PrismaService) {}

  // 팀원 추가 화면의 후보 명단 (GET /teams/:id/members/candidates) — 이미 이 팀에 있는 사람은 뺀다.
  async findCandidates(
    requesterId: string,
    teamId: string,
  ): Promise<TeamMemberCandidate[]> {
    await this.assertCanManage(requesterId, teamId);
    const users = await this.prisma.user.findMany({
      where: { teamMemberships: { none: { teamId, endedAt: null } } },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        teamMemberships: {
          where: { endedAt: null },
          select: { team: { select: { name: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      teamName: user.teamMemberships[0]?.team.name ?? null,
    }));
  }

  async add(
    requesterId: string,
    teamId: string,
    userIds: string[],
  ): Promise<{ added: number }> {
    await this.assertCanManage(requesterId, teamId);

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true },
    });
    if (users.length !== userIds.length) {
      throw new BadRequestException('존재하지 않는 유저가 있습니다.');
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      // 다른 팀 소속은 종료하고 새로 넣는다. 이미 이 팀 사람이면 아무 일도 없다.
      await tx.teamMembership.updateMany({
        where: { userId: { in: userIds }, endedAt: null, teamId: { not: teamId } },
        data: { endedAt: now },
      });
      const already = await tx.teamMembership.findMany({
        where: { userId: { in: userIds }, teamId, endedAt: null },
        select: { userId: true },
      });
      const existing = new Set(already.map((row) => row.userId));
      const fresh = userIds.filter((id) => !existing.has(id));
      if (fresh.length > 0) {
        await tx.teamMembership.createMany({
          data: fresh.map((userId) => ({ teamId, userId, startedAt: now })),
        });
      }
    });
    return { added: userIds.length };
  }

  // 팀장은 이 경로로 뺄 수 없다 — 팀장을 바꾸려면 팀 편집에서 다른 사람을 팀장으로 지정한다
  // (셀이 셀장을 셀원 제거로 못 빼는 것과 같은 규칙).
  async remove(
    requesterId: string,
    teamId: string,
    userId: string,
  ): Promise<{ id: string }> {
    await this.assertCanManage(requesterId, teamId);
    const membership = await this.prisma.teamMembership.findFirst({
      where: { teamId, userId, endedAt: null },
      select: { id: true, role: true },
    });
    if (!membership) throw new NotFoundException('이 팀의 팀원이 아닙니다.');
    if (membership.role === 'LEADER') {
      throw new BadRequestException(
        '팀장은 뺄 수 없습니다. 팀 편집에서 팀장을 먼저 바꿔주세요.',
      );
    }

    await this.prisma.teamMembership.update({
      where: { id: membership.id },
      data: { endedAt: new Date() },
    });
    return { id: userId };
  }

  private async assertCanManage(requesterId: string, teamId: string) {
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
          where: { teamId, endedAt: null, role: 'LEADER' },
          select: { id: true },
        },
      },
    });
    if (!requester?.isAdmin && (requester?.teamMemberships.length ?? 0) === 0) {
      throw new ForbiddenException('팀장 또는 관리자만 팀원을 관리할 수 있습니다.');
    }
  }
}
