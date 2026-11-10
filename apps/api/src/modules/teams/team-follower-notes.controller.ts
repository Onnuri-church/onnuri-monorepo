import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DedupeCreate } from '../../common/decorators/dedupe-create.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import {
  CreateTeamFollowerNoteCommentDto,
  CreateTeamFollowerNoteDto,
  UpdateTeamFollowerNoteCommentDto,
  UpdateTeamFollowerNoteDto,
} from './dto/team-follower-note.dto';
import { TeamFollowerNotesService } from './team-follower-notes.service';

// 팀 팔로워 노트 (SCRUM-180) — 열람부터 제한된 케어 기록이라 전부 필수 인증이다.
// 세부 권한(작성은 팀장만 등)은 서비스가 검증한다.
@UseGuards(JwtAuthGuard)
@Controller('teams/:teamId/follower-notes')
export class TeamFollowerNotesController {
  constructor(private readonly service: TeamFollowerNotesService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Param('teamId') teamId: string) {
    return this.service.findAll(user.sub, teamId);
  }

  @DedupeCreate()
  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Param('teamId') teamId: string,
    @Body() dto: CreateTeamFollowerNoteDto,
  ) {
    return this.service.create(user.sub, teamId, dto);
  }

  @Patch(':noteId')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('teamId') teamId: string,
    @Param('noteId') noteId: string,
    @Body() dto: UpdateTeamFollowerNoteDto,
  ) {
    return this.service.update(user.sub, teamId, noteId, dto);
  }

  @Delete(':noteId')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('teamId') teamId: string,
    @Param('noteId') noteId: string,
  ) {
    return this.service.remove(user.sub, teamId, noteId);
  }

  @DedupeCreate()
  @Post(':noteId/comments')
  addComment(
    @CurrentUser() user: JwtPayload,
    @Param('teamId') teamId: string,
    @Param('noteId') noteId: string,
    @Body() dto: CreateTeamFollowerNoteCommentDto,
  ) {
    return this.service.addComment(user.sub, teamId, noteId, dto);
  }

  @Patch(':noteId/comments/:commentId')
  updateComment(
    @CurrentUser() user: JwtPayload,
    @Param('teamId') teamId: string,
    @Param('noteId') noteId: string,
    @Param('commentId') commentId: string,
    @Body() dto: UpdateTeamFollowerNoteCommentDto,
  ) {
    return this.service.updateComment(user.sub, teamId, noteId, commentId, dto);
  }

  @Delete(':noteId/comments/:commentId')
  removeComment(
    @CurrentUser() user: JwtPayload,
    @Param('teamId') teamId: string,
    @Param('noteId') noteId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.service.removeComment(user.sub, teamId, noteId, commentId);
  }
}
