import { Injectable } from '@nestjs/common';
import type { CellSummary } from '@onnuri/shared';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CellsService {
  constructor(private readonly prisma: PrismaService) {}

  // 프로필 설정의 소속 셀 선택지 — 지금 들어갈 수 있는 셀만 내려준다
  // (관리자가 삭제했거나 활동 종료일이 지난 셀 제외).
  findAll(): Promise<CellSummary[]> {
    return this.prisma.cell.findMany({
      where: { deletedAt: null, expiresAt: { gte: new Date() } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }
}
