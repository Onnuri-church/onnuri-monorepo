import { Module } from '@nestjs/common';

import { GroupMeetingsController } from './group-meetings.controller';
import { GroupMeetingsService } from './group-meetings.service';

@Module({
  controllers: [GroupMeetingsController],
  providers: [GroupMeetingsService],
})
export class GroupMeetingsModule {}
