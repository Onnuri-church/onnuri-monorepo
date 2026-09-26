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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { AddTeamMembersDto } from './dto/add-members.dto';
import { TeamMembersService } from './team-members.service';

// 팀원 관리 — 전부 그 팀 팀장·관리자만 (검증은 서비스). 팀원 목록 조회는 GET /teams/:id에 있다.
@UseGuards(JwtAuthGuard)
@Controller('teams/:teamId/members')
export class TeamMembersController {
  constructor(private readonly teamMembersService: TeamMembersService) {}

  @Get('candidates')
  findCandidates(
    @CurrentUser() user: JwtPayload,
    @Param('teamId') teamId: string,
  ) {
    return this.teamMembersService.findCandidates(user.sub, teamId);
  }

  @Post()
  add(
    @CurrentUser() user: JwtPayload,
    @Param('teamId') teamId: string,
    @Body() dto: AddTeamMembersDto,
  ) {
    return this.teamMembersService.add(user.sub, teamId, dto.userIds);
  }

  @Delete(':userId')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
  ) {
    return this.teamMembersService.remove(user.sub, teamId, userId);
  }
}
