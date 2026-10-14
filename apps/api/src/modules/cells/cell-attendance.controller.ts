import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CellAttendanceService } from './cell-attendance.service';
import { FindCellAttendanceDto } from './dto/find-cell-attendance.dto';
import { SaveCellAttendanceDto } from './dto/save-cell-attendance.dto';

// 출석 관리는 셀장·관리자 전용 화면이라 전부 필수 인증 (세부 권한은 서비스).
@UseGuards(JwtAuthGuard)
@Controller('cells/:cellId/attendance')
export class CellAttendanceController {
  constructor(private readonly cellAttendanceService: CellAttendanceService) {}

  @Get()
  find(
    @CurrentUser() user: JwtPayload,
    @Param('cellId') cellId: string,
    @Query() query: FindCellAttendanceDto,
  ) {
    return this.cellAttendanceService.find(user.sub, cellId, query.date);
  }

  // 등록하기 = 그 날짜 상태 전체를 다시 그리는 멱등 저장이라 PUT이다.
  @Put()
  save(
    @CurrentUser() user: JwtPayload,
    @Param('cellId') cellId: string,
    @Body() dto: SaveCellAttendanceDto,
  ) {
    return this.cellAttendanceService.save(user.sub, cellId, dto);
  }
}
