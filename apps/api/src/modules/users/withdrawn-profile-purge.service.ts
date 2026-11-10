import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { UsersService } from './users.service';

// 탈퇴 30일이 지난 계정의 프로필(생년월일·성별·연락처·사진·소개)을 지운다 — 매일 한 번
// (2026-09-08 확정 정책, docs/erd.md). 이름과 출석·활동 기록은 기명 보존이라 건드리지 않는다.
@Injectable()
export class WithdrawnProfilePurgeService implements OnApplicationBootstrap {
  private readonly logger = new Logger(WithdrawnProfilePurgeService.name);

  constructor(private readonly usersService: UsersService) {}

  // Render 무료 인스턴스는 잠든 동안 cron이 돌지 않는다 — 깨어날 때 밀린 파기를 먼저 처리한다.
  // DB 연결 없이 부팅해도 서버는 떠야 하므로 던지지 않는다 (CellExpiryService와 같은 방식).
  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.purge();
    } catch (error) {
      this.logger.warn(
        `withdrawn profile purge at boot failed: ${String(error)}`,
      );
    }
  }

  // 매일 한국 시간 새벽 3시(서버 UTC 18시).
  @Cron('0 18 * * *')
  async purge(): Promise<void> {
    const count = await this.usersService.purgeWithdrawnProfiles();
    if (count > 0) {
      this.logger.log(
        `탈퇴 30일이 지난 회원 ${count}명의 프로필을 파기했습니다`,
      );
    }
  }
}
