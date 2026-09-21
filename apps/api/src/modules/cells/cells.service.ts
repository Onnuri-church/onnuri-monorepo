import { Injectable } from '@nestjs/common';
import type { CellDetailResponse, CellRole, CellSummary } from '@onnuri/shared';

import { PrismaService } from '../prisma/prisma.service';

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
}
