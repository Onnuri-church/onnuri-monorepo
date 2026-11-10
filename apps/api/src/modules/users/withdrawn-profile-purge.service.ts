import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { UsersService } from './users.service';

// 탈퇴 계정 정리 — 매일 한 번 (보관 정책은 docs/erd.md).
// 30일 지나면 프로필(생년월일·성별·연락처·사진·소개) 파기, 1년 지나면 이름 익명 처리.
// 출석·글·댓글 행은 지우지 않는다 (통계 유지).
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
    const purged = await this.usersService.purgeWithdrawnProfiles();
    if (purged > 0) {
      this.logger.log(
        `탈퇴 30일이 지난 회원 ${purged}명의 프로필을 파기했습니다`,
      );
    }
    const anonymized = await this.usersService.anonymizeWithdrawnNames();
    if (anonymized > 0) {
      this.logger.log(
        `탈퇴 1년이 지난 회원 ${anonymized}명의 이름을 익명 처리했습니다`,
      );
    }
  }
}
