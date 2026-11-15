import { Module } from '@nestjs/common';

import { AppleSignInModule } from '../apple-sign-in/apple-sign-in.module';
import { UploadsModule } from '../uploads/uploads.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { WithdrawnProfilePurgeService } from './withdrawn-profile-purge.service';

@Module({
  // 아바타 교체 시 옛 파일 정리에 UploadsService를 쓴다.
  // 탈퇴 때 Apple 로그인 토큰 철회에 AppleSignInClient를 쓴다 (SCRUM-205).
  imports: [UploadsModule, AppleSignInModule],
  controllers: [UsersController],
  providers: [UsersService, WithdrawnProfilePurgeService],
  exports: [UsersService],
})
export class UsersModule {}
