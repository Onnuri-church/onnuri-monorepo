import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateTeamMessageDto } from './dto/create-team-message.dto';
import { TeamMessagesService } from './team-messages.service';

// 팀 단톡 — 팀원·관리자 전용 (검증은 서비스).
@UseGuards(JwtAuthGuard)
@Controller('teams/:teamId/messages')
export class TeamMessagesController {
  constructor(private readonly teamMessagesService: TeamMessagesService) {}

  @Get()
  find(
    @CurrentUser() user: JwtPayload,
    @Param('teamId') teamId: string,
    @Query('after') after?: string,
  ) {
    return this.teamMessagesService.find(user.sub, teamId, after);
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Param('teamId') teamId: string,
    @Body() dto: CreateTeamMessageDto,
  ) {
    return this.teamMessagesService.create(user.sub, teamId, dto.content);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':messageId')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('teamId') teamId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.teamMessagesService.remove(user.sub, teamId, messageId);
  }
}
