import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminGuard } from '../../common/guards/admin.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateBannerDto } from './dto/create-banner.dto';
import { NoticesService } from './notices.service';

// 홈 배너 — 현재 배너 조회는 게스트도 되고(홈 화면), 관리(목록/등록/내리기)는 관리자만.
@Controller('notices')
export class NoticesController {
  constructor(private readonly noticesService: NoticesService) {}

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
  @Delete('banners/:id')
  removeBanner(@Param('id') id: string) {
    return this.noticesService.removeBanner(id);
  }
}
