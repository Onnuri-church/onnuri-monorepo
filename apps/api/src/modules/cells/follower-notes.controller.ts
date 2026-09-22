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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateFollowerNoteCommentDto } from './dto/create-follower-note-comment.dto';
import { CreateFollowerNoteDto } from './dto/create-follower-note.dto';
import { UpdateFollowerNoteDto } from './dto/update-follower-note.dto';
import { FollowerNotesService } from './follower-notes.service';

// 팔로워 노트는 열람부터 제한된 케어 기록이라(셀장·관리자만) 전부 필수 인증이다 —
// 세부 권한(작성은 셀장만 등)은 서비스가 검증한다.
@UseGuards(JwtAuthGuard)
@Controller('cells/:cellId/follower-notes')
export class FollowerNotesController {
  constructor(private readonly followerNotesService: FollowerNotesService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Param('cellId') cellId: string) {
    return this.followerNotesService.findAll(user.sub, cellId);
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Param('cellId') cellId: string,
    @Body() dto: CreateFollowerNoteDto,
  ) {
    return this.followerNotesService.create(user.sub, cellId, dto);
  }

  @Patch(':noteId')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('cellId') cellId: string,
    @Param('noteId') noteId: string,
    @Body() dto: UpdateFollowerNoteDto,
  ) {
    return this.followerNotesService.update(user.sub, cellId, noteId, dto);
  }

  @Delete(':noteId')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('cellId') cellId: string,
    @Param('noteId') noteId: string,
  ) {
    return this.followerNotesService.remove(user.sub, cellId, noteId);
  }

  @Post(':noteId/comments')
  addComment(
    @CurrentUser() user: JwtPayload,
    @Param('cellId') cellId: string,
    @Param('noteId') noteId: string,
    @Body() dto: CreateFollowerNoteCommentDto,
  ) {
    return this.followerNotesService.addComment(user.sub, cellId, noteId, dto);
  }
}
