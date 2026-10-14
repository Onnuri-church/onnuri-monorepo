import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { NotificationsService } from './notifications.service';

// 알림센터 — 본인 알림만 다루므로 전부 로그인 필수.
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findMine(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.findMine(user.sub);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.markAllRead(user.sub);
  }

  // 벨 아이콘 뱃지용 — 목록 전체를 받지 않고 개수만 가볍게 묻는다.
  @Get('unread-count')
  unreadCount(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.unreadCount(user.sub);
  }

  // 전체 지우기 — 알림센터 헤더 버튼. :id보다 먼저 선언해야 'all'이 id로 안 잡힌다.
  @Delete()
  removeAll(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.removeAll(user.sub);
  }

  // 개별 지우기 — 알림 행 왼쪽 스와이프.
  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.notificationsService.remove(user.sub, id);
  }
}
