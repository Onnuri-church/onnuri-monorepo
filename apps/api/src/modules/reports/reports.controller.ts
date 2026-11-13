import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminGuard } from '../../common/guards/admin.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateReportDto } from './dto/create-report.dto';
import { HandleReportDto } from './dto/handle-report.dto';
import { ReportsService } from './reports.service';

// 신고 접수 (SCRUM-199) — 글·댓글·채팅의 "신고하기".
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateReportDto) {
    return this.reportsService.create(user.sub, dto);
  }
}

// 관리자 신고 목록·처리.
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/reports')
export class AdminReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.reportsService.findForAdmin(
      status === 'done' ? 'done' : 'open',
    );
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch(':id')
  handle(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: HandleReportDto,
  ) {
    return this.reportsService.handle(user.sub, id, dto.action);
  }
}
