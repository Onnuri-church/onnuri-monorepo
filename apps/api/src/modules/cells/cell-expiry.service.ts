import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { kstToday } from '../../common/utils/date';
import { PrismaService } from '../prisma/prisma.service';

// 셀 활동기간이 끝나면 그 셀 소속을 종료 처리한다 — 셀원·셀장 모두 무소속이 되고, 셀장 권한
// (팔로워 노트·출석 관리·리더 방)도 이때 같이 끝난다 (2026-10-27 확정). 삭제가 아니라 종료라
// 출석·노트 기록은 그대로 남는다 (docs/attendance-data-model.md §3.2).
// 종료일은 처리한 날이 아니라 셀의 활동 종료 예정일로 찍는다 — 소속 기간이 셀 기간과 맞아야
// 기간으로 출석을 묶는 통계(엑셀 다운로드)가 어긋나지 않는다.
@Injectable()
export class CellExpiryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CellExpiryService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Render 무료 인스턴스는 잠든 동안 cron이 돌지 않는다 — 깨어날 때 밀린 종료를 먼저 처리한다.
  // DB 연결 없이 부팅해도(PrismaService가 연결 실패를 삼킨다) 서버는 떠야 하므로 던지지 않는다.
  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.endExpiredMemberships();
    } catch (error) {
      this.logger.warn(`cell expiry at boot failed: ${String(error)}`);
    }
  }

  // 매일 한국 시간 자정(서버 UTC 15시) — 전날로 활동기간이 끝난 셀을 넘긴다.
  @Cron('0 15 * * *')
  async endExpiredMemberships(): Promise<void> {
    const cells = await this.prisma.cell.findMany({
      where: {
        expiresAt: { lt: kstToday() },
        memberships: { some: { endedAt: null } },
      },
      select: { id: true, expiresAt: true },
    });
    for (const cell of cells) {
      await this.prisma.cellMembership.updateMany({
        where: { cellId: cell.id, endedAt: null },
        data: { endedAt: cell.expiresAt },
      });
    }
    if (cells.length > 0) {
      this.logger.log(
        `활동기간이 끝난 셀 ${cells.length}개의 소속을 종료했습니다`,
      );
    }
  }
}
