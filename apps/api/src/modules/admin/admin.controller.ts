import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';

import { AdminGuard } from '../../common/guards/admin.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminAttendanceService } from './admin-attendance.service';
import { AdminDownloadService } from './admin-download.service';
import { AdminOffDaysService } from './admin-off-days.service';
import { FindAdminAttendanceDto } from './dto/find-admin-attendance.dto';
import { FindAdminDownloadDto } from './dto/find-admin-download.dto';
import { FindOffDaysDto } from './dto/find-off-days.dto';
import { SetOffDayDto } from './dto/set-off-day.dto';

// 관리자 화면 전용 집계 — 전부 관리자만 (마이페이지 관리자 메뉴에서만 진입).
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminAttendanceService: AdminAttendanceService,
    private readonly adminDownloadService: AdminDownloadService,
    private readonly adminOffDaysService: AdminOffDaysService,
  ) {}

  @Get('attendance')
  findAttendance(@Query() query: FindAdminAttendanceDto) {
    return this.adminAttendanceService.find(query);
  }

  @Get('off-days')
  findOffDays(@Query() query: FindOffDaysDto) {
    return this.adminOffDaysService.find(query.month);
  }

  // 기존 출석 기록이 있으면 409(삭제될 기록 수) — confirm: true로 다시 보내면 지우고 지정한다.
  @Put('off-days/:date')
  setOffDay(@Param('date') date: string, @Body() dto: SetOffDayDto) {
    return this.adminOffDaysService.set(date, dto);
  }

  // 다운로드 전 미리보기 — 같은 쿼리로 건수와 앞쪽 몇 줄만 JSON으로 준다.
  @Get('download/preview')
  previewDownload(@Query() query: FindAdminDownloadDto) {
    return this.adminDownloadService.preview(query);
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
