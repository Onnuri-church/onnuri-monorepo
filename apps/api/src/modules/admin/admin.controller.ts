import { Controller, Get, Query, StreamableFile, UseGuards } from '@nestjs/common';

import { AdminGuard } from '../../common/guards/admin.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminAttendanceService } from './admin-attendance.service';
import { AdminDownloadService } from './admin-download.service';
import { FindAdminAttendanceDto } from './dto/find-admin-attendance.dto';
import { FindAdminDownloadDto } from './dto/find-admin-download.dto';

// 관리자 화면 전용 집계 — 전부 관리자만 (마이페이지 관리자 메뉴에서만 진입).
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminAttendanceService: AdminAttendanceService,
    private readonly adminDownloadService: AdminDownloadService,
  ) {}

  @Get('attendance')
  findAttendance(@Query() query: FindAdminAttendanceDto) {
    return this.adminAttendanceService.find(query);
  }

  // 엑셀 파일을 그대로 내려준다 — 앱이 파일로 저장한 뒤 공유 시트를 띄운다.
  @Get('download')
  async download(@Query() query: FindAdminDownloadDto): Promise<StreamableFile> {
    const buffer = await this.adminDownloadService.build(query);
    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: 'attachment; filename="onnuri-export.xlsx"',
    });
  }
}
