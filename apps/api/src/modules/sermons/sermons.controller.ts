import { Controller, Get, Param, Query } from '@nestjs/common';

import { FindSermonsDto } from './dto/find-sermons.dto';
import { SermonsService } from './sermons.service';

// 말씀 게시판 — 게스트도 보는 조회만 있다. 영상 등록은 SermonSyncService가 유튜브에서 한다.
@Controller('sermons')
export class SermonsController {
  constructor(private readonly sermonsService: SermonsService) {}

  @Get()
  findSermons(@Query() query: FindSermonsDto) {
    return this.sermonsService.findSermons(query.month);
  }

  @Get(':id')
  findSermon(@Param('id') id: string) {
    return this.sermonsService.findSermon(id);
  }
}
