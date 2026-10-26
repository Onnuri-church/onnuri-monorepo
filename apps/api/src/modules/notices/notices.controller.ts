import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminGuard } from '../../common/guards/admin.guard';
import {
  ContentManagerGuard,
  RequireContentPermission,
} from '../../common/guards/content-manager.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateBannerDto } from './dto/create-banner.dto';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { SetBannerActiveDto } from './dto/set-banner-active.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';
import { NoticesService } from './notices.service';
import { DedupeCreate } from '../../common/decorators/dedupe-create.decorator';

// 홈 배너·공지사항 — 조회는 게스트도 된다. 배너 관리는 관리자와 배너 권한이 켜진 팀의 팀원,
// 공지사항 등록·수정·삭제는 관리자만.
// 정적 라우트('banner'/'banners')를 ':id'보다 먼저 둔다 — Express는 등록 순서 매칭.
@Controller('notices')
export class NoticesController {
  constructor(private readonly noticesService: NoticesService) {}

  // 공지 목록 (마이페이지 공지사항) — 게스트 열람 가능. cursor=이전 쪽의 nextCursor, limit 기본 20(최대 50).
  @Get()
  findNotices(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('month') month?: string,
    @Query('grouped') grouped?: string,
  ) {
    return this.noticesService.findNotices(
      cursor,
      limit ? Number(limit) : undefined,
      { month, grouped: grouped === 'true' },
    );
  }

  @Get('banner')
  findActiveBanner() {
    return this.noticesService.findActiveBanner();
  }

  @UseGuards(JwtAuthGuard, ContentManagerGuard)
  @RequireContentPermission('canManageBanner')
  @Get('banners')
  findBanners() {
    return this.noticesService.findBanners();
  }

  @UseGuards(JwtAuthGuard, ContentManagerGuard)
  @RequireContentPermission('canManageBanner')
  @DedupeCreate()
  @Post('banners')
  createBanner(@CurrentUser() user: JwtPayload, @Body() dto: CreateBannerDto) {
    return this.noticesService.createBanner(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, ContentManagerGuard)
  @RequireContentPermission('canManageBanner')
  @Patch('banners/:id')
  updateBanner(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    return this.noticesService.updateBanner(id, dto);
  }

  // 홈 표시 켜기/끄기 — 켜면 다른 배너는 자동으로 꺼진다.
  @UseGuards(JwtAuthGuard, ContentManagerGuard)
  @RequireContentPermission('canManageBanner')
  @Put('banners/:id/active')
  setBannerActive(@Param('id') id: string, @Body() dto: SetBannerActiveDto) {
    return this.noticesService.setBannerActive(id, dto.active);
  }

  @UseGuards(JwtAuthGuard, ContentManagerGuard)
  @RequireContentPermission('canManageBanner')
  @Delete('banners/:id')
  removeBanner(@Param('id') id: string) {
    return this.noticesService.removeBanner(id);
  }

  // 공지 한 건 — 상세 화면·알림 링크가 쓴다. 정적 라우트 뒤에 둔다.
  @Get(':id')
  findNotice(@Param('id') id: string) {
    return this.noticesService.findNotice(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @DedupeCreate()
  @Post()
  createNotice(@CurrentUser() user: JwtPayload, @Body() dto: CreateNoticeDto) {
    return this.noticesService.createNotice(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id')
  updateNotice(@Param('id') id: string, @Body() dto: UpdateNoticeDto) {
    return this.noticesService.updateNotice(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  removeNotice(@Param('id') id: string) {
    return this.noticesService.removeNotice(id);
  }
}
