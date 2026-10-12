import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ContentManagerGuard,
  RequireContentPermission,
} from '../../common/guards/content-manager.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { BulletinsService } from './bulletins.service';
import { CreateBulletinDto } from './dto/create-bulletin.dto';
import { FindBulletinsDto } from './dto/find-bulletins.dto';
import { UpdateBulletinDto } from './dto/update-bulletin.dto';

// 주보·나눔지 — 조회는 게스트도 되고, 등록·수정·삭제는 관리자와 주보 업로드 권한이 켜진 팀의 팀원만.
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

  @UseGuards(JwtAuthGuard, ContentManagerGuard)
  @RequireContentPermission('canUploadBulletin')
  @Post()
  createBulletin(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBulletinDto,
  ) {
    return this.bulletinsService.createBulletin(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, ContentManagerGuard)
  @RequireContentPermission('canUploadBulletin')
  @Patch(':id')
  updateBulletin(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateBulletinDto,
  ) {
    return this.bulletinsService.updateBulletin(id, user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, ContentManagerGuard)
  @RequireContentPermission('canUploadBulletin')
  @Delete(':id')
  removeBulletin(@Param('id') id: string) {
    return this.bulletinsService.removeBulletin(id);
  }
}
