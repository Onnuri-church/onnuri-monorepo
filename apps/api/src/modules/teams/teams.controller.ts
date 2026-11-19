import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminGuard } from '../../common/guards/admin.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamsService } from './teams.service';
import { DedupeCreate } from '../../common/decorators/dedupe-create.decorator';

// 열람은 게스트도 된다 (팀스토리 열람 범위). 생성·수정·삭제는 관리자만
// (docs/attendance-data-model.md §1 "관리자: 셀/팀 페이지 생성·수정·삭제").
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  findAll() {
    return this.teamsService.findAll();
  }

  // 팀 소개는 게스트도 보지만 팀원 명단(이름·프로필 사진)은 로그인한 사람에게만 준다
  // (SCRUM-265) — 스토어에 공개된 앱이라 로그인 없이 누구나 볼 수 있는 범위에서 뺀다.
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  async findOne(
    @CurrentUser() user: JwtPayload | undefined,
    @Param('id') id: string,
  ) {
    const team = await this.teamsService.findOne(id);
    if (!team) throw new NotFoundException('팀을 찾을 수 없습니다.');
    return user ? team : { ...team, members: [] };
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @DedupeCreate()
  @Post()
  create(@Body() dto: CreateTeamDto) {
    return this.teamsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTeamDto) {
    return this.teamsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.teamsService.softDelete(id);
  }
}
