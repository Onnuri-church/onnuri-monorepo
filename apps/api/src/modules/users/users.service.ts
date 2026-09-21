import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AdminMemberDetail,
  AdminMemberRole,
  AdminMemberSummary,
  CellRole,
  MeResponse,
  TeamRole,
  User,
} from '@onnuri/shared';

import type { Prisma } from '../../../generated/prisma';
import { toDateLabel } from '../../common/utils/date';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAdminMemberDto } from './dto/update-admin-member.dto';
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

  // 전체 회원 목록 (관리자 전용) — 회원 관리 목록과 셀 생성/편집의 셀장·부셀장 선택지가 쓴다.
  // 탈퇴 회원은 제외. 뱃지는 관리자 > 팀장 > 셀장(부셀장 포함) 우선순위로 하나만 단다.
  async findAllForAdmin(): Promise<AdminMemberSummary[]> {
    const users = await this.prisma.user.findMany({
      where: { withdrawnAt: null },
      select: {
        id: true,
        name: true,
        isAdmin: true,
        cellMemberships: {
          where: { endedAt: null, cell: { deletedAt: null } },
          select: { role: true, cell: { select: { name: true } } },
        },
        teamMemberships: {
          where: { endedAt: null, team: { deletedAt: null } },
          select: { role: true, team: { select: { name: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    return users.map((user) => {
      const cell = user.cellMemberships[0] ?? null;
      const team = user.teamMemberships[0] ?? null;
      return {
        id: user.id,
        name: user.name,
        cellName: cell?.cell.name ?? null,
        teamName: team?.team.name ?? null,
        badge: user.isAdmin
          ? ('admin' as const)
          : team?.role === 'LEADER'
            ? ('teamLeader' as const)
            : cell && cell.role !== 'MEMBER'
              ? ('cellLeader' as const)
              : null,
      };
    });
  }

  // 회원 상세 (관리자 전용) — 상세 화면의 표시 문구와 편집 화면의 프리필 원본을 같이 내려준다.
  async findDetailForAdmin(id: string): Promise<AdminMemberDetail> {
    const user = await this.prisma.user.findFirst({
      where: { id, withdrawnAt: null },
      select: {
        id: true,
        name: true,
        birthDate: true,
        gender: true,
        phone: true,
        isAdmin: true,
        createdAt: true,
        cellMemberships: {
          where: { endedAt: null, cell: { deletedAt: null } },
          select: { role: true, cell: { select: { id: true, name: true } } },
        },
        teamMemberships: {
          where: { endedAt: null, team: { deletedAt: null } },
          select: { role: true, team: { select: { id: true, name: true } } },
        },
      },
    });
    if (!user) throw new NotFoundException('회원을 찾을 수 없습니다.');

    const cell = user.cellMemberships[0] ?? null;
    const team = user.teamMemberships[0] ?? null;
    const isTeamLeader = team?.role === 'LEADER';
    const isCellLeader = cell !== null && cell.role !== 'MEMBER';
    // 등급 표시는 관리자 > 팀장 > 팔로워 > 일반 우선순위 (겸직 가능하지만 뱃지·권한 행은 하나).
    const role: AdminMemberRole = isTeamLeader
      ? 'TEAM_LEADER'
      : isCellLeader
        ? 'CELL_LEADER'
        : 'GENERAL';

    return {
      id: user.id,
      name: user.name,
      birthDateLabel: user.birthDate ? toDateLabel(user.birthDate) : null,
      birthDate: user.birthDate?.toISOString().slice(0, 10) ?? null,
      gender: user.gender,
      genderLabel: user.gender ? (user.gender === 'MALE' ? '남성' : '여성') : null,
      phone: user.phone,
      cell: cell ? { id: cell.cell.id, name: cell.cell.name } : null,
      team: team ? { id: team.team.id, name: team.team.name } : null,
      role,
      roleLabel: user.isAdmin
        ? '관리자'
        : isTeamLeader
          ? '팀장'
          : isCellLeader
            ? '팔로워'
            : '일반',
      badge: user.isAdmin
        ? 'admin'
        : isTeamLeader
          ? 'teamLeader'
          : isCellLeader
            ? 'cellLeader'
            : null,
      joinedAtLabel: toDateLabel(user.createdAt),
    };
  }

  // 회원 편집 (관리자 전용) — 보낸 필드만 반영. 권한(role)은 등급 컬럼이 아니라 소속
  // 멤버십의 역할로 반영한다: 단일 선택 UI라 고른 쪽만 리더가 되고 다른 쪽 리더 역할은
  // 내려간다. 관리자(isAdmin) 지정은 앱 대상에서 제외 (2026-09-21 확정).
  async updateByAdmin(
    id: string,
    dto: UpdateAdminMemberDto,
  ): Promise<AdminMemberDetail> {
    const target = await this.prisma.user.findFirst({
      where: { id, withdrawnAt: null },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('회원을 찾을 수 없습니다.');

    await this.prisma.$transaction(async (tx) => {
      if (dto.cellId) {
        const cell = await tx.cell.findFirst({
          where: { id: dto.cellId, deletedAt: null },
          select: { id: true },
        });
        if (!cell) throw new BadRequestException('존재하지 않는 셀입니다.');
      }
      if (dto.teamId) {
        const team = await tx.team.findFirst({
          where: { id: dto.teamId, deletedAt: null },
          select: { id: true },
        });
        if (!team) throw new BadRequestException('존재하지 않는 팀입니다.');
      }

      await tx.user.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.birthDate !== undefined && {
            birthDate: new Date(dto.birthDate),
          }),
          ...(dto.gender !== undefined && { gender: dto.gender }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
        },
      });

      if (dto.cellId !== undefined) {
        await this.syncCellMembership(tx, id, dto.cellId);
      }
      if (dto.teamId !== undefined) {
        await this.syncTeamMembership(tx, id, dto.teamId);
      }
      if (dto.role !== undefined) {
        await this.applyAdminRole(tx, id, dto.role);
      }
    });

    return this.findDetailForAdmin(id);
  }

  // 회원 삭제 (관리자 전용) — 탈퇴와 같은 soft delete. 출석·활동 기록은 기명 보존이고
  // 프로필 파기는 30일 배치 소관 (2026-09-08 확정). 진행 중 소속은 종료 처리한다.
  async withdrawByAdmin(id: string): Promise<{ id: string }> {
    const target = await this.prisma.user.findFirst({
      where: { id, withdrawnAt: null },
      select: { id: true, isAdmin: true },
    });
    if (!target) throw new NotFoundException('회원을 찾을 수 없습니다.');
    if (target.isAdmin) {
      throw new BadRequestException('관리자 계정은 여기서 삭제할 수 없습니다.');
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id }, data: { withdrawnAt: now } }),
      this.prisma.cellMembership.updateMany({
        where: { userId: id, endedAt: null },
        data: { endedAt: now },
      }),
      this.prisma.teamMembership.updateMany({
        where: { userId: id, endedAt: null },
        data: { endedAt: now },
      }),
    ]);
    return { id };
  }

  // 권한 선택을 멤버십 역할로 옮긴다. 역할 변경도 행 종료 + 새 행 (이력 보존 패턴).
  private async applyAdminRole(
    tx: Prisma.TransactionClient,
    userId: string,
    role: AdminMemberRole,
  ) {
    const [cellMembership, teamMembership] = await Promise.all([
      tx.cellMembership.findFirst({
        where: { userId, endedAt: null },
        select: { id: true, cellId: true, role: true },
      }),
      tx.teamMembership.findFirst({
        where: { userId, endedAt: null },
        select: { id: true, teamId: true, role: true },
      }),
    ]);

    const setCellRole = async (nextRole: CellRole) => {
      if (!cellMembership || cellMembership.role === nextRole) return;
      await tx.cellMembership.update({
        where: { id: cellMembership.id },
        data: { endedAt: new Date() },
      });
      await tx.cellMembership.create({
        data: {
          cellId: cellMembership.cellId,
          userId,
          role: nextRole,
          startedAt: new Date(),
        },
      });
    };
    const setTeamRole = async (nextRole: TeamRole) => {
      if (!teamMembership || teamMembership.role === nextRole) return;
      await tx.teamMembership.update({
        where: { id: teamMembership.id },
        data: { endedAt: new Date() },
      });
      await tx.teamMembership.create({
        data: {
          teamId: teamMembership.teamId,
          userId,
          role: nextRole,
          startedAt: new Date(),
        },
      });
    };

    if (role === 'GENERAL') {
      await setCellRole('MEMBER');
      await setTeamRole('MEMBER');
      return;
    }
    if (role === 'TEAM_LEADER') {
      if (!teamMembership) {
        throw new BadRequestException('소속 팀이 있어야 팀장으로 지정할 수 있습니다.');
      }
      await setTeamRole('LEADER');
      await setCellRole('MEMBER');
      return;
    }
    // CELL_LEADER(팔로워) — 셀장은 셀당 한 명이라 이미 다른 셀장이 있으면 셀 편집으로 안내.
    if (!cellMembership) {
      throw new BadRequestException('소속 셀이 있어야 팔로워로 지정할 수 있습니다.');
    }
    const otherLeader = await tx.cellMembership.findFirst({
      where: {
        cellId: cellMembership.cellId,
        endedAt: null,
        role: 'LEADER',
        userId: { not: userId },
      },
      select: { id: true },
    });
    if (otherLeader) {
      throw new BadRequestException(
        '이미 셀장이 있는 셀이에요. 셀 편집에서 셀장을 교체해주세요.',
      );
    }
    await setCellRole('LEADER');
    await setTeamRole('MEMBER');
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
