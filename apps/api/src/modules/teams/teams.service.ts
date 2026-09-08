import { Injectable } from '@nestjs/common';
import type { TeamSummary } from '@onnuri/shared';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  // 프로필 설정의 소속 팀 선택지.
  findAll(): Promise<TeamSummary[]> {
    return this.prisma.team.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }
}
