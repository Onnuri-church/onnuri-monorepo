import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/check-in.dto';

// QR 예배 출석 — 본인 출석이라 로그인만 있으면 된다 (게스트는 로그인 유도).
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @UseGuards(JwtAuthGuard)
  @Post('check-in')
  checkIn(@CurrentUser() user: JwtPayload, @Body() dto: CheckInDto) {
    return this.attendanceService.checkIn(user.sub, dto.code);
  }
}
