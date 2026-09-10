import { BadRequestException, Injectable } from '@nestjs/common';
import type { MeResponse, User } from '@onnuri/shared';

import type { Prisma } from '../../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // 응답 모양은 @onnuri/shared의 User 계약을 따른다 — 모바일이 이 타입 그대로 소비한다.
  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        birthDate: true,
        gender: true,
        phone: true,
        avatarUrl: true,
        intro: true,
        isAdmin: true,
        createdAt: true,
      },
    });
    if (!user) return null;

    return {
      ...user,
      // 계약: birthDate는 YYYY-MM-DD (나이는 클라이언트가 계산), createdAt은 ISO 문자열
      birthDate: user.birthDate?.toISOString().slice(0, 10) ?? null,
      createdAt: user.createdAt.toISOString(),
      // 프로필 설정 필수 3항목을 마쳤는지 — 모바일의 온보딩 분기 기준인 계산 필드 (저장 안 함)
      profileCompleted:
        user.birthDate !== null && user.gender !== null && user.phone !== null,
    };
  }

  // GET/PATCH /users/me 응답 — findById에 진행 중(endedAt 없음)인 소속 멤버십을 붙인다.
  // soft delete된 셀/팀은 소속 없음으로 취급한다 (기록은 남지만 화면에 현재 소속으로 안 보여줌).
  async findMe(id: string): Promise<MeResponse | null> {
    const user = await this.findById(id);
    if (!user) return null;

    const [cellMembership, teamMembership] = await Promise.all([
      this.prisma.cellMembership.findFirst({
        where: { userId: id, endedAt: null, cell: { deletedAt: null } },
        select: { role: true, cell: { select: { id: true, name: true } } },
      }),
      this.prisma.teamMembership.findFirst({
        where: { userId: id, endedAt: null, team: { deletedAt: null } },
        select: { role: true, team: { select: { id: true, name: true } } },
      }),
    ]);

    return {
      ...user,
      cell: cellMembership
        ? { ...cellMembership.cell, role: cellMembership.role }
        : null,
      team: teamMembership
        ? { ...teamMembership.team, role: teamMembership.role }
        : null,
    };
  }

  // 프로필 등록·수정 (프로필 설정 화면의 등록하기). 소속 셀/팀은 User 컬럼이 아니라
  // 멤버십 행으로 표현하므로(docs/erd.md — 레거시 cellName/teamId 제거 근거) 여기서 같이 반영한다.
  async updateMyProfile(
    userId: string,
    dto: UpdateMyProfileDto,
  ): Promise<MeResponse> {
    await this.prisma.$transaction(async (tx) => {
      if (dto.cellId) {
        const cell = await tx.cell.findFirst({
          where: { id: dto.cellId, deletedAt: null },
          select: { id: true },
        });
        if (!cell) throw new BadRequestException('존재하지 않는 셀입니다.');
      }
      if (dto.teamId) {
        const team = await tx.team.findUnique({
          where: { id: dto.teamId },
          select: { id: true },
        });
        if (!team) throw new BadRequestException('존재하지 않는 팀입니다.');
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          birthDate: new Date(dto.birthDate),
          gender: dto.gender,
          phone: dto.phone,
        },
      });
      await this.syncCellMembership(tx, userId, dto.cellId);
      await this.syncTeamMembership(tx, userId, dto.teamId);
    });

    // 방금 update가 성공했으므로 유저는 반드시 있다.
    return (await this.findMe(userId))!;
  }

  // 소속 변경은 기존 행을 지우지 않고 endedAt을 찍고 새 행을 만든다 — 소속 이력 보존
  // (schema.prisma의 CellMembership/TeamMembership 주석). null이면 현재 소속만 끝낸다.
  private async syncCellMembership(
    tx: Prisma.TransactionClient,
    userId: string,
    cellId: string | null,
  ) {
    const active = await tx.cellMembership.findFirst({
      where: { userId, endedAt: null },
      select: { id: true, cellId: true },
    });
    if ((active?.cellId ?? null) === cellId) return;

    const today = new Date();
    if (active) {
      await tx.cellMembership.update({
        where: { id: active.id },
        data: { endedAt: today },
      });
    }
    if (cellId) {
      await tx.cellMembership.create({
        data: { userId, cellId, startedAt: today },
      });
    }
  }

  private async syncTeamMembership(
    tx: Prisma.TransactionClient,
    userId: string,
    teamId: string | null,
  ) {
    const active = await tx.teamMembership.findFirst({
      where: { userId, endedAt: null },
      select: { id: true, teamId: true },
    });
    if ((active?.teamId ?? null) === teamId) return;

    const today = new Date();
    if (active) {
      await tx.teamMembership.update({
        where: { id: active.id },
        data: { endedAt: today },
      });
    }
    if (teamId) {
      await tx.teamMembership.create({
        data: { userId, teamId, startedAt: today },
      });
    }
  }
}
