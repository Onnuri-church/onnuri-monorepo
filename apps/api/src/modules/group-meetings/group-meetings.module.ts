import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { UploadsModule } from '../uploads/uploads.module';
import { GroupMeetingsController } from './group-meetings.controller';
import { GroupMeetingsService } from './group-meetings.service';

@Module({
  // 활동 사진 삭제 시 창고 파일 정리에 UploadsService를, 신청/승인 알림에 NotificationsService를 쓴다.
  imports: [UploadsModule, NotificationsModule],
  controllers: [GroupMeetingsController],
  providers: [GroupMeetingsService],
})
export class GroupMeetingsModule {}
