import { Module } from '@nestjs/common';

import { UploadsModule } from '../uploads/uploads.module';
import { GroupMeetingsController } from './group-meetings.controller';
import { GroupMeetingsService } from './group-meetings.service';

@Module({
  // 활동 사진 삭제 시 창고 파일 정리에 UploadsService를 쓴다.
  imports: [UploadsModule],
  controllers: [GroupMeetingsController],
  providers: [GroupMeetingsService],
})
export class GroupMeetingsModule {}
