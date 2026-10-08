import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminGuard } from '../../common/guards/admin.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateBannerDto } from './dto/create-banner.dto';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { SetBannerActiveDto } from './dto/set-banner-active.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { NoticesService } from './notices.service';

// 홈 배너·공지사항 — 조회는 게스트도 되고, 등록·삭제는 관리자만.
// 정적 라우트('banner'/'banners')를 ':id'보다 먼저 둔다 — Express는 등록 순서 매칭.
@Controller('notices')
export class NoticesController {
  constructor(private readonly noticesService: NoticesService) {}

  // 공지 목록 (마이페이지 공지사항) — 게스트 열람 가능.
  @Get()
  findNotices() {
    return this.noticesService.findNotices();
  }

  @Get('banner')
  findActiveBanner() {
    return this.noticesService.findActiveBanner();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('banners')
  findBanners() {
    return this.noticesService.findBanners();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('banners')
  createBanner(@CurrentUser() user: JwtPayload, @Body() dto: CreateBannerDto) {
    return this.noticesService.createBanner(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('banners/:id')
  updateBanner(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    return this.noticesService.updateBanner(id, dto);
  }

  // 홈 표시 켜기/끄기 — 켜면 다른 배너는 자동으로 꺼진다.
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put('banners/:id/active')
  setBannerActive(@Param('id') id: string, @Body() dto: SetBannerActiveDto) {
    return this.noticesService.setBannerActive(id, dto.active);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete('banners/:id')
  removeBanner(@Param('id') id: string) {
    return this.noticesService.removeBanner(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  createNotice(@CurrentUser() user: JwtPayload, @Body() dto: CreateNoticeDto) {
    return this.noticesService.createNotice(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  removeNotice(@Param('id') id: string) {
    return this.noticesService.removeNotice(id);
  }
}
