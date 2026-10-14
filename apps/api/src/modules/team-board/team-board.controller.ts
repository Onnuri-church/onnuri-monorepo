import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import {
  CreateTeamBoardCommentDto,
  SaveTeamBoardPostDto,
  ToggleTeamBoardReactionDto,
  UpdateTeamBoardCommentDto,
} from './dto/team-board.dto';
import { TeamBoardService } from './team-board.service';

// 팀 전용 게시판 — 그 팀 팀원과 관리자만 (검증은 서비스).
@UseGuards(JwtAuthGuard)
@Controller('teams/:teamId/board')
export class TeamBoardController {
  constructor(private readonly teamBoardService: TeamBoardService) {}

  @Get()
  findPosts(
    @CurrentUser() user: JwtPayload,
    @Param('teamId') teamId: string,
    @Query('cursor') cursor?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.teamBoardService.findPosts(
      user.sub,
      teamId,
      cursor,
      year ? Number(year) : undefined,
      month ? Number(month) : undefined,
    );
  }

  // 새 글 수 — 내가 아직 안 연 글. 팀 공간·팀 상세 입구의 빨간 표시가 쓴다 (':postId'보다 먼저 선언).
  @Get('unread')
  unread(@CurrentUser() user: JwtPayload, @Param('teamId') teamId: string) {
    return this.teamBoardService.unreadCount(user.sub, teamId);
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Param('teamId') teamId: string,
    @Body() dto: SaveTeamBoardPostDto,
  ) {
    return this.teamBoardService.create(user.sub, teamId, dto);
  }

  @Get(':postId')
  findPost(
    @CurrentUser() user: JwtPayload,
    @Param('teamId') teamId: string,
    @Param('postId') postId: string,
  ) {
    return this.teamBoardService.findPost(user.sub, teamId, postId);
  }

  @Patch(':postId')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('teamId') teamId: string,
    @Param('postId') postId: string,
    @Body() dto: SaveTeamBoardPostDto,
  ) {
    return this.teamBoardService.update(user.sub, teamId, postId, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':postId')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('teamId') teamId: string,
    @Param('postId') postId: string,
  ) {
    return this.teamBoardService.remove(user.sub, teamId, postId);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(':postId/comments')
  addComment(
    @CurrentUser() user: JwtPayload,
    @Param('teamId') teamId: string,
    @Param('postId') postId: string,
    @Body() dto: CreateTeamBoardCommentDto,
  ) {
    return this.teamBoardService.addComment(user.sub, teamId, postId, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch(':postId/comments/:commentId')
  updateComment(
    @CurrentUser() user: JwtPayload,
    @Param('teamId') teamId: string,
    @Param('postId') postId: string,
    @Param('commentId') commentId: string,
    @Body() dto: UpdateTeamBoardCommentDto,
  ) {
    return this.teamBoardService.updateComment(user.sub, teamId, postId, commentId, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':postId/comments/:commentId')
  removeComment(
    @CurrentUser() user: JwtPayload,
    @Param('teamId') teamId: string,
    @Param('postId') postId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.teamBoardService.removeComment(user.sub, teamId, postId, commentId);
  }

  @Put(':postId/reactions')
  toggleReaction(
    @CurrentUser() user: JwtPayload,
    @Param('teamId') teamId: string,
    @Param('postId') postId: string,
    @Body() dto: ToggleTeamBoardReactionDto,
  ) {
    return this.teamBoardService.toggleReaction(user.sub, teamId, postId, dto.emoji);
  }
}
