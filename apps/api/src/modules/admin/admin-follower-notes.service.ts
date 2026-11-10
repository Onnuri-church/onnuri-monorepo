import { Injectable } from '@nestjs/common';
import type { AdminFollowerNoteOverview, FollowerNoteCounts } from '@onnuri/shared';

import { kstToday } from '../../common/utils/date';
import { PrismaService } from '../prisma/prisma.service';

// 관리자 팔로워 노트 관리 (SCRUM-181) — 마이페이지 > 팔로워 노트 관리의 셀·팀 목록.
// 행마다 노트 수와 "새 노트" 수를 붙인다. 새 노트 = 이 관리자가 그 게시판을 마지막으로 연 뒤 다른 사람이 쓴 노트
// (연 시각은 게시판 조회 때 FollowerNoteView에 남는다 — markViewed).
@Injectable()
export class AdminFollowerNotesService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(adminId: string): Promise<AdminFollowerNoteOverview> {
    const [cells, teams, cellNotes, teamNotes, views] = await Promise.all([
      // 활동 중인 셀 + 이미 끝났어도 노트가 남아 있는 셀 (삭제된 셀은 뺀다).
      this.prisma.cell.findMany({
        where: {
          deletedAt: null,
          OR: [
            { expiresAt: { gte: kstToday() } },
            { meetings: { some: { followerNote: { isNot: null } } } },
          ],
        },
        select: {
          id: true,
          name: true,
          expiresAt: true,
          coverImageUrl: true,
          memberships: {
            where: { endedAt: null, role: { in: ['LEADER', 'SUB_LEADER'] } },
            select: { role: true, user: { select: { id: true, name: true } } },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.team.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, iconUrl: true, tagline: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.followerNote.findMany({
        select: { createdAt: true, authorId: true, meeting: { select: { cellId: true } } },
      }),
      this.prisma.teamFollowerNote.findMany({
        select: { createdAt: true, authorId: true, teamId: true },
      }),
      this.prisma.followerNoteView.findMany({
        where: { userId: adminId },
        select: { cellId: true, teamId: true, viewedAt: true },
      }),
    ]);

    const cellViewed = new Map(views.filter((v) => v.cellId).map((v) => [v.cellId!, v.viewedAt]));
    const teamViewed = new Map(views.filter((v) => v.teamId).map((v) => [v.teamId!, v.viewedAt]));

    const count = (
      notes: { createdAt: Date; authorId: string }[],
      viewedAt: Date | undefined,
    ): FollowerNoteCounts => {
      const last = notes.reduce<Date | null>(
        (max, note) => (max === null || note.createdAt > max ? note.createdAt : max),
        null,
      );
      return {
        totalCount: notes.length,
        newCount: notes.filter(
          (note) => note.authorId !== adminId && (!viewedAt || note.createdAt > viewedAt),
        ).length,
        lastNoteAt: last?.toISOString() ?? null,
      };
    };

    return {
      cells: cells.map((cell) => {
        const leader = cell.memberships.find((m) => m.role === 'LEADER')?.user;
        const vice = cell.memberships.find((m) => m.role === 'SUB_LEADER')?.user;
        return {
          id: cell.id,
          name: cell.name,
          leaderId: leader?.id ?? null,
          leaderName: leader?.name ?? null,
          viceLeaderId: vice?.id ?? null,
          viceLeaderName: vice?.name ?? null,
          expiresAt: cell.expiresAt.toISOString().slice(0, 10),
          coverImageUrl: cell.coverImageUrl,
          ...count(
            cellNotes.filter((note) => note.meeting.cellId === cell.id),
            cellViewed.get(cell.id),
          ),
        };
      }),
      teams: teams.map((team) => ({
        id: team.id,
        name: team.name,
        iconName: team.iconUrl,
        tagline: team.tagline,
        ...count(
          teamNotes.filter((note) => note.teamId === team.id),
          teamViewed.get(team.id),
        ),
      })),
    };
  }
}

// 관리자가 셀·팀 노트 게시판을 열었다는 기록 — 노트 서비스의 목록 조회가 관리자일 때 부른다.
export async function markFollowerNotesViewed(
  prisma: PrismaService,
  userId: string,
  target: { cellId: string } | { teamId: string },
): Promise<void> {
  const viewedAt = new Date();
  if ('cellId' in target) {
    await prisma.followerNoteView.upsert({
      where: { userId_cellId: { userId, cellId: target.cellId } },
      update: { viewedAt },
      create: { userId, cellId: target.cellId, viewedAt },
    });
  } else {
    await prisma.followerNoteView.upsert({
      where: { userId_teamId: { userId, teamId: target.teamId } },
      update: { viewedAt },
      create: { userId, teamId: target.teamId, viewedAt },
    });
  }
}
