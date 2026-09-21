import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CellDetailResponse, CellRole, CellSummary } from '@onnuri/shared';

import type { Prisma } from '../../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCellDto } from './dto/create-cell.dto';
import { UpdateCellDto } from './dto/update-cell.dto';

// 구성원 정렬: 셀장 → 부셀장 → 셀원(이름순). 화면(구성원 탭·셀원 관리)이 이 순서를 그대로 그린다.
const ROLE_ORDER: Record<CellRole, number> = { LEADER: 0, SUB_LEADER: 1, MEMBER: 2 };

@Injectable()
export class CellsService {
  constructor(private readonly prisma: PrismaService) {}

  // 전체 셀 목록·프로필 설정 선택지 — 지금 활동 중인 셀만 내려준다
  // (관리자가 삭제했거나 활동 종료일이 지난 셀 제외). 목록 행에 쓰는 셀장/부셀장 이름을 같이 붙인다.
  async findAll(): Promise<CellSummary[]> {
    const cells = await this.prisma.cell.findMany({
      where: { deletedAt: null, expiresAt: { gte: new Date() } },
      select: {
        id: true,
        name: true,
        expiresAt: true,
        memberships: {
          where: { endedAt: null, role: { in: ['LEADER', 'SUB_LEADER'] } },
          select: { role: true, user: { select: { name: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    return cells.map((cell) => ({
      id: cell.id,
      name: cell.name,
      leaderName:
        cell.memberships.find((m) => m.role === 'LEADER')?.user.name ?? null,
      viceLeaderName:
        cell.memberships.find((m) => m.role === 'SUB_LEADER')?.user.name ??
        null,
      // 계약: ISO date (YYYY-MM-DD) — 셀 편집 폼의 활동기간 프리필용
      expiresAt: cell.expiresAt.toISOString().slice(0, 10),
    }));
  }

  // 개별 셀 페이지(헤더·구성원 탭). 소프트 삭제된 셀은 없는 것으로 취급한다 —
  // 기록 화면(출석부 등)의 "(삭제된 셀)" 표시는 그 화면의 조회가 따로 다룬다.
  async findOne(id: string): Promise<CellDetailResponse | null> {
    const cell = await this.prisma.cell.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        coverImageUrl: true,
        startedAt: true,
        expiresAt: true,
        memberships: {
          where: { endedAt: null },
          select: {
            role: true,
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!cell) return null;

    const members = cell.memberships
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
      id: cell.id,
      name: cell.name,
      coverImageUrl: cell.coverImageUrl,
      // 계약: ISO date (YYYY-MM-DD) — 시각은 의미 없는 DATE 컬럼이다
      startedAt: cell.startedAt.toISOString().slice(0, 10),
      expiresAt: cell.expiresAt.toISOString().slice(0, 10),
      members,
    };
  }

  // 셀 생성 (관리자 전용) — 셀장은 필수, 부셀장은 선택 (부셀장 체크 해제 시안).
  async create(adminId: string, dto: CreateCellDto): Promise<CellDetailResponse> {
    if (dto.viceLeaderId && dto.viceLeaderId === dto.leaderId) {
      throw new BadRequestException('셀장과 부셀장은 같은 사람일 수 없습니다.');
    }

    const cell = await this.prisma.$transaction(async (tx) => {
      const created = await tx.cell.create({
        data: {
          name: dto.name,
          coverImageUrl: dto.coverImageUrl ?? null,
          startedAt: new Date(),
          expiresAt: new Date(dto.expiresAt),
          createdById: adminId,
        },
      });
      await this.assignRole(tx, created.id, dto.leaderId, 'LEADER');
      if (dto.viceLeaderId) {
        await this.assignRole(tx, created.id, dto.viceLeaderId, 'SUB_LEADER');
      }
      return created;
    });

    return (await this.findOne(cell.id))!;
  }

  // 셀 수정 (관리자 전용) — 보낸 필드만 반영. 셀장/부셀장 교체 시 기존 사람은 이 셀의
  // 셀원으로 남긴다 (멤버십 행 종료 후 MEMBER 행 생성 — 이력 보존 패턴, erd.md).
  async update(id: string, dto: UpdateCellDto): Promise<CellDetailResponse> {
    const cell = await this.prisma.cell.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        memberships: {
          where: { endedAt: null, role: { in: ['LEADER', 'SUB_LEADER'] } },
          select: { id: true, role: true, userId: true },
        },
      },
    });
    if (!cell) throw new NotFoundException('존재하지 않는 셀입니다.');

    const currentLeader = cell.memberships.find((m) => m.role === 'LEADER');
    const currentVice = cell.memberships.find((m) => m.role === 'SUB_LEADER');

    // 변경 결과 셀장과 부셀장이 같은 사람이 되면 거절한다 (생략된 필드는 현재 값 유지).
    const nextLeaderId = dto.leaderId ?? currentLeader?.userId ?? null;
    const nextViceId =
      dto.viceLeaderId === undefined
        ? (currentVice?.userId ?? null)
        : dto.viceLeaderId;
    if (nextLeaderId !== null && nextLeaderId === nextViceId) {
      throw new BadRequestException('셀장과 부셀장은 같은 사람일 수 없습니다.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cell.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.expiresAt !== undefined && {
            expiresAt: new Date(dto.expiresAt),
          }),
          ...(dto.coverImageUrl !== undefined && {
            coverImageUrl: dto.coverImageUrl,
          }),
        },
      });

      if (dto.leaderId && dto.leaderId !== currentLeader?.userId) {
        if (currentLeader) {
          await this.demoteToMember(tx, id, currentLeader.userId);
        }
        await this.assignRole(tx, id, dto.leaderId, 'LEADER');
      }

      if (dto.viceLeaderId !== undefined) {
        const viceChanged = (currentVice?.userId ?? null) !== dto.viceLeaderId;
        if (viceChanged) {
          if (currentVice) {
            await this.demoteToMember(tx, id, currentVice.userId);
          }
          if (dto.viceLeaderId) {
            await this.assignRole(tx, id, dto.viceLeaderId, 'SUB_LEADER');
          }
        }
      }
    });

    return (await this.findOne(id))!;
  }

  // 셀 삭제 (관리자 전용) — soft delete. 출석·이력은 기명으로 보존되고(정책),
  // 진행 중 멤버십은 종료 처리해서 구성원들이 "현재 소속 없음"이 되게 한다.
  async softDelete(id: string): Promise<{ id: string }> {
    const cell = await this.prisma.cell.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!cell) throw new NotFoundException('존재하지 않는 셀입니다.');

    await this.prisma.$transaction([
      this.prisma.cell.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
      this.prisma.cellMembership.updateMany({
        where: { cellId: id, endedAt: null },
        data: { endedAt: new Date() },
      }),
    ]);
    return { id };
  }

  // 셀원 제거 — 관리자 또는 그 셀의 셀장/부셀장만. 셀장·부셀장 본인은 이 경로로 못 빼고
  // 셀 편집(교체)으로만 바꾼다 (셀원 관리 시안: 일반 셀원에게만 삭제 버튼).
  async removeMember(
    requesterId: string,
    cellId: string,
    memberId: string,
  ): Promise<{ id: string }> {
    const cell = await this.prisma.cell.findFirst({
      where: { id: cellId, deletedAt: null },
      select: { id: true },
    });
    if (!cell) throw new NotFoundException('존재하지 않는 셀입니다.');

    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: {
        isAdmin: true,
        cellMemberships: {
          where: {
            cellId,
            endedAt: null,
            role: { in: ['LEADER', 'SUB_LEADER'] },
          },
          select: { id: true },
        },
      },
    });
    const isCellLeader = (requester?.cellMemberships.length ?? 0) > 0;
    if (!requester || (!requester.isAdmin && !isCellLeader)) {
      throw new ForbiddenException('셀장 또는 관리자만 셀원을 제거할 수 있습니다.');
    }

    const membership = await this.prisma.cellMembership.findFirst({
      where: { cellId, userId: memberId, endedAt: null },
      select: { id: true, role: true },
    });
    if (!membership) throw new NotFoundException('이 셀의 셀원이 아닙니다.');
    if (membership.role !== 'MEMBER') {
      throw new BadRequestException('셀장·부셀장은 셀 편집에서 변경해주세요.');
    }

    await this.prisma.cellMembership.update({
      where: { id: membership.id },
      data: { endedAt: new Date() },
    });
    return { id: memberId };
  }

  // 역할 지정 — 소속 있는 회원은 자동 이동 (2026-09-08 확정): 진행 중인 셀 멤버십을 전부
  // 종료하고 새 행을 만든다. 같은 셀 안의 역할 변경도 행 종료 후 새 행 (이력 보존).
  private async assignRole(
    tx: Prisma.TransactionClient,
    cellId: string,
    userId: string,
    role: CellRole,
  ) {
    const user = await tx.user.findFirst({
      where: { id: userId, withdrawnAt: null },
      select: { id: true },
    });
    if (!user) throw new BadRequestException('존재하지 않는 회원입니다.');

    await tx.cellMembership.updateMany({
      where: { userId, endedAt: null },
      data: { endedAt: new Date() },
    });
    await tx.cellMembership.create({
      data: { cellId, userId, role, startedAt: new Date() },
    });
  }

  // 셀장/부셀장 교체 시 기존 사람을 같은 셀의 셀원으로 내린다 (행 종료 + MEMBER 행 생성).
  private async demoteToMember(
    tx: Prisma.TransactionClient,
    cellId: string,
    userId: string,
  ) {
    await tx.cellMembership.updateMany({
      where: { cellId, userId, endedAt: null },
      data: { endedAt: new Date() },
    });
    await tx.cellMembership.create({
      data: { cellId, userId, role: 'MEMBER', startedAt: new Date() },
    });
  }
}
