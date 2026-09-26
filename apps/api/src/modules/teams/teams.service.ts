import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { TeamDetailResponse, TeamRole, TeamSummary } from '@onnuri/shared';

import type { Prisma } from '../../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

// 팀원 정렬: 팀장 → 팀원(이름순). 화면(상세 미리보기·팀원 리스트)이 이 순서를 그대로 그린다.
const ROLE_ORDER: Record<TeamRole, number> = { LEADER: 0, MEMBER: 1 };

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  // 프로필 설정의 소속 팀 선택지 + 팀스토리 목록. 선택지 쪽은 id·name만 읽는다.
  async findAll(): Promise<TeamSummary[]> {
    const teams = await this.prisma.team.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, iconUrl: true, tagline: true },
      orderBy: { name: 'asc' },
    });

    // iconUrl에는 이미지 주소가 아니라 아이콘 이름이 들어간다 (TeamSummary 주석 참고).
    return teams.map((team) => ({
      id: team.id,
      name: team.name,
      iconName: team.iconUrl,
      tagline: team.tagline,
    }));
  }

  // 팀스토리 상세와 팀원 리스트가 같이 쓴다. 사진은 갤러리 조회가 따로 내려준다.
  async findOne(id: string): Promise<TeamDetailResponse | null> {
    const team = await this.prisma.team.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        iconUrl: true,
        tagline: true,
        description: true,
        coverImageUrl: true,
        memberships: {
          where: { endedAt: null },
          select: {
            role: true,
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!team) return null;

    const members = team.memberships
      .map((m) => ({
        id: m.user.id,
        name: m.user.name,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
      }))
      .sort(
        (a, b) =>
          ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
          a.name.localeCompare(b.name, 'ko'),
      );

    return {
      id: team.id,
      name: team.name,
      iconName: team.iconUrl,
      tagline: team.tagline,
      description: team.description,
      coverImageUrl: team.coverImageUrl,
      members,
    };
  }

  // 팀 생성 (관리자 전용) — 팀장 지정은 LEADER 멤버십 한 줄로 표현한다.
  async create(dto: CreateTeamDto): Promise<{ id: string }> {
    await this.assertUserExists(dto.leaderId);
    const duplicated = await this.prisma.team.findUnique({
      where: { name: dto.name },
      select: { id: true },
    });
    if (duplicated) throw new BadRequestException('같은 이름의 팀이 이미 있습니다.');

    const team = await this.prisma.$transaction(async (tx) => {
      const created = await tx.team.create({
        data: {
          name: dto.name,
          tagline: dto.tagline ?? null,
          description: dto.description ?? null,
          coverImageUrl: dto.coverImageUrl ?? null,
        },
        select: { id: true },
      });
      await this.setLeader(tx, created.id, dto.leaderId);
      return created;
    });
    return team;
  }

  // 보낸 필드만 반영한다. 팀장을 바꾸면 이전 팀장은 팀원으로 내려온다 (팀에서 빠지진 않는다).
  async update(id: string, dto: UpdateTeamDto): Promise<{ id: string }> {
    await this.assertTeamExists(id);
    if (dto.leaderId) await this.assertUserExists(dto.leaderId);

    await this.prisma.$transaction(async (tx) => {
      await tx.team.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.tagline !== undefined && { tagline: dto.tagline }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.coverImageUrl !== undefined && { coverImageUrl: dto.coverImageUrl }),
        },
      });
      if (dto.leaderId) await this.setLeader(tx, id, dto.leaderId);
    });
    return { id };
  }

  // soft delete — 기록은 보존하고 목록에서만 감춘다 (2026-09-08 확정). 소속은 같이 종료한다.
  async softDelete(id: string): Promise<{ id: string }> {
    await this.assertTeamExists(id);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.team.update({ where: { id }, data: { deletedAt: now } }),
      this.prisma.teamMembership.updateMany({
        where: { teamId: id, endedAt: null },
        data: { endedAt: now },
      }),
    ]);
    return { id };
  }

  // 팀장은 팀당 한 명이다 — 기존 팀장을 팀원으로 내리고 대상자를 팀장으로 올린다.
  // 대상자가 다른 팀 소속이면 그 소속을 종료한다 (한 사람은 한 팀 — 프로필의 소속 팀과 같은 규칙).
  private async setLeader(
    tx: Prisma.TransactionClient,
    teamId: string,
    leaderId: string,
  ) {
    await tx.teamMembership.updateMany({
      where: { teamId, endedAt: null, role: 'LEADER' },
      data: { role: 'MEMBER' },
    });

    const mine = await tx.teamMembership.findFirst({
      where: { userId: leaderId, endedAt: null },
      select: { id: true, teamId: true },
    });
    if (mine?.teamId === teamId) {
      await tx.teamMembership.update({ where: { id: mine.id }, data: { role: 'LEADER' } });
      return;
    }
    if (mine) {
      await tx.teamMembership.update({ where: { id: mine.id }, data: { endedAt: new Date() } });
    }
    await tx.teamMembership.create({
      data: { teamId, userId: leaderId, role: 'LEADER', startedAt: new Date() },
    });
  }

  private async assertTeamExists(id: string) {
    const team = await this.prisma.team.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!team) throw new NotFoundException('존재하지 않는 팀입니다.');
  }

  private async assertUserExists(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new BadRequestException('존재하지 않는 유저입니다.');
  }
}
