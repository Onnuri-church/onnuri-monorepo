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
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateCellNewsDto } from './dto/create-cell-news.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateTeamActivityDto } from './dto/create-team-activity.dto';
import { TogglePostReactionDto } from './dto/toggle-post-reaction.dto';
import { UpdateCellNewsDto } from './dto/update-cell-news.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { UpdateTeamActivityDto } from './dto/update-team-activity.dto';
import { FindCellNewsDto } from './dto/find-cell-news.dto';
import { FindQtSharesDto } from './dto/find-qt-shares.dto';
import { FindTeamActivitiesDto } from './dto/find-team-activities.dto';
import { CreateQtShareDto } from './dto/create-qt-share.dto';
import { UpdateQtShareDto } from './dto/update-qt-share.dto';
import { PostsService } from './posts.service';

// 게시판별 엔드포인트를 먼저 두고 :id 라우트를 뒤에 둔다 — 나중에 GET /posts/:id(상세)가
// 생겼을 때 순서가 뒤집혀 있으면 :id가 'qt-shares'를 게시글 ID로 먹는다.
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  // 홈의 큐티나눔(최신 3건)·부서활동(최신 5건) 섹션. 홈은 게스트도 보지만 큐티나눔은 회원
  // 전용이라, 토큰이 없으면 큐티나눔 목록을 비워서 내려준다 (부서활동은 그대로).
  @UseGuards(OptionalJwtAuthGuard)
  @Get('home')
  findHomePosts(@CurrentUser() user: JwtPayload | undefined) {
    return this.postsService.findHomePosts(user?.sub);
  }

  // 큐티나눔은 로그인한 회원만 열람한다 (2026-10-13 확정: 개인적인 나눔이라 게스트에게 공개하지 않음).
  @UseGuards(JwtAuthGuard)
  @Get('qt-shares')
  findQtShares(
    @CurrentUser() user: JwtPayload | undefined,
    @Query() query: FindQtSharesDto,
  ) {
    return this.postsService.findQtShares(user?.sub, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('qt-shares/:id')
  findQtShare(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.postsService.findQtShare(id, user.sub);
  }

  // 셀 소식 — 열람은 게스트도, 작성은 그 셀 셀원·관리자만, 삭제는 작성자·셀장·관리자만
  // (권한 검증은 서비스).
  @UseGuards(OptionalJwtAuthGuard)
  @Get('cell-news')
  findCellNews(@Query() query: FindCellNewsDto) {
    return this.postsService.findCellNews(query.cellId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('cell-news/:id')
  findCellNewsDetail(
    @CurrentUser() user: JwtPayload | undefined,
    @Param('id') id: string,
  ) {
    return this.postsService.findCellNewsDetail(id, user?.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('cell-news')
  createCellNews(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCellNewsDto,
  ) {
    return this.postsService.createCellNews(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('cell-news/:id')
  updateCellNews(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCellNewsDto,
  ) {
    return this.postsService.updateCellNews(id, user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('cell-news/:id')
  deleteCellNews(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.postsService.deleteCellNews(id, user.sub);
  }

  // 부서활동은 게스트도 열람한다 (큐티나눔과 같은 기준).
  @UseGuards(OptionalJwtAuthGuard)
  @Get('team-activities')
  findTeamActivities(@Query() query: FindTeamActivitiesDto) {
    return this.postsService.findTeamActivities(query.teamId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('team-activities/:id')
  findTeamActivity(
    @CurrentUser() user: JwtPayload | undefined,
    @Param('id') id: string,
  ) {
    return this.postsService.findTeamActivity(id, user?.sub);
  }

  // 작성은 그 팀의 팀원·관리자만 (권한 검증은 서비스).
  @UseGuards(JwtAuthGuard)
  @Post('team-activities')
  createTeamActivity(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTeamActivityDto,
  ) {
    return this.postsService.createTeamActivity(user.sub, dto);
  }

  // 수정은 내 글만 (권한 검증은 서비스).
  @UseGuards(JwtAuthGuard)
  @Patch('team-activities/:id')
  updateTeamActivity(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTeamActivityDto,
  ) {
    return this.postsService.updateTeamActivity(id, user.sub, dto);
  }

  // 작성·수정·삭제는 로그인이 필요하다. 수정·삭제 권한(내 글인지)은 서비스가 본다.
  @UseGuards(JwtAuthGuard)
  @Post('qt-shares')
  createQtShare(
    @CurrentUser() user: JwtPayload,
    @Body() body: CreateQtShareDto,
  ) {
    return this.postsService.createQtShare(user.sub, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('qt-shares/:id')
  updateQtShare(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: UpdateQtShareDto,
  ) {
    return this.postsService.updateQtShare(id, user.sub, body);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('team-activities/:id')
  removeTeamActivity(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.postsService.removeTeamActivity(id, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/comments')
  addComment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.postsService.addComment(id, user.sub, dto.content, dto.parentId);
  }

  // 댓글 수정 — 작성자와 관리자만 (검증은 서비스).
  @UseGuards(JwtAuthGuard)
  @Patch(':id/comments/:commentId')
  updateComment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.postsService.updateComment(id, commentId, user.sub, dto.content);
  }

  // 부서활동 글 이모지 반응 토글 — 다시 누르면 취소.
  @UseGuards(JwtAuthGuard)
  @Put('team-activities/:id/reactions')
  toggleTeamActivityReaction(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: TogglePostReactionDto,
  ) {
    return this.postsService.toggleTeamActivityReaction(id, user.sub, dto.emoji);
  }

  // 댓글 삭제는 글이 아니라 댓글에 달리지만, 경로는 글 밑에 둔다 — 어떤 글의 댓글인지가
  // 주소에 드러나야 로그에서 읽힌다.
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id/comments/:commentId')
  removeComment(
    @CurrentUser() user: JwtPayload,
    @Param('commentId') commentId: string,
  ) {
    return this.postsService.removeComment(commentId, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('qt-shares/:id')
  removeQtShare(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.postsService.removeQtShare(id, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(':id/likes')
  like(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.postsService.like(id, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id/likes')
  unlike(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.postsService.unlike(id, user.sub);
  }
}
