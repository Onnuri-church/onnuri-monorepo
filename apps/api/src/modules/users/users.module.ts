import { Module } from '@nestjs/common';

import { AppleSignInModule } from '../apple-sign-in/apple-sign-in.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UploadsModule } from '../uploads/uploads.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { WithdrawnProfilePurgeService } from './withdrawn-profile-purge.service';

@Module({
  // 아바타 교체 시 옛 파일 정리에 UploadsService를 쓴다.
  // 탈퇴 때 Apple 로그인 토큰 철회에 AppleSignInClient를 쓴다 (SCRUM-205).
  // 리더·관리자 탈퇴를 관리자에게 알리는 데 NotificationsService를 쓴다 (SCRUM-274).
  imports: [UploadsModule, AppleSignInModule, NotificationsModule],
  controllers: [UsersController],
  providers: [UsersService, WithdrawnProfilePurgeService],
  exports: [UsersService],
})
export class UsersModule {}
