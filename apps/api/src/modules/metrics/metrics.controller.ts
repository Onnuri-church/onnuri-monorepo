import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AdminGuard } from '../../common/guards/admin.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MetricsService } from './metrics.service';

const MAX_DAYS = 90;

// 운영 지표 (SCRUM-249·250) — 관리자 전용. days는 오늘을 포함한 기간(기본 30, 1~90).
// 숫자가 아닌 값은 기본값으로 본다 (전역 변환이 NaN으로 바꾸고 DefaultValuePipe가 기본값을 넣는다).
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  find(@Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number) {
    return this.metricsService.getMetrics(
      Math.min(MAX_DAYS, Math.max(1, days)),
    );
  }
}
