import { Controller, Get } from '@nestjs/common';

import { GroupMeetingsService } from './group-meetings.service';

// TODO(로그인 연동 후): JwtAuthGuard 적용 + 401 E2E 추가.
// 지금은 로컬 DB가 없어 실제 토큰 발급이 불가능하므로 열어둔다.
@Controller('group-meetings')
export class GroupMeetingsController {
  constructor(private readonly groupMeetingsService: GroupMeetingsService) {}

  @Get()
  findAll() {
    return this.groupMeetingsService.findAll();
  }
}
