import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminGuard } from '../../common/guards/admin.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { BulletinsService } from './bulletins.service';
import { CreateBulletinDto } from './dto/create-bulletin.dto';
import { FindBulletinsDto } from './dto/find-bulletins.dto';

// 주보·나눔지 — 조회는 게스트도 되고, 등록은 관리자만.
@Controller('bulletins')
export class BulletinsController {
  constructor(private readonly bulletinsService: BulletinsService) {}

  @Get()
  findBulletins(@Query() query: FindBulletinsDto) {
    return this.bulletinsService.findBulletins(query.month);
  }

  @Get(':id')
  findBulletin(@Param('id') id: string) {
    return this.bulletinsService.findBulletin(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  createBulletin(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBulletinDto,
  ) {
    return this.bulletinsService.createBulletin(user.sub, dto);
  }
}
