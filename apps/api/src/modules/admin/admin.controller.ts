import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { AdminGuard } from '../../common/guards/admin.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminAttendanceService } from './admin-attendance.service';
import { FindAdminAttendanceDto } from './dto/find-admin-attendance.dto';

// 관리자 화면 전용 집계 — 전부 관리자만 (마이페이지 관리자 메뉴에서만 진입).
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminAttendanceService: AdminAttendanceService) {}

  @Get('attendance')
  findAttendance(@Query() query: FindAdminAttendanceDto) {
    return this.adminAttendanceService.find(query);
  }
}
