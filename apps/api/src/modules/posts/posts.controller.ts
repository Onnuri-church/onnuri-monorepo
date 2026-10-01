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
import { UpdateCellNewsDto } from './dto/update-cell-news.dto';
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

  // 홈의 큐티나눔(최신 3건)·부서활동(최신 5건) 섹션. 홈은 게스트도 보고, 내 상태(좋아요 등)가
  // 없어서 토큰을 읽지 않는다.
  @Get('home')
  findHomePosts() {
    return this.postsService.findHomePosts();
  }

  // 열람은 게스트도 된다 (README 기능 범위: "큐티나눔 게시판 — 열람 + 로그인 후 작성").
  // 좋아요처럼 로그인이 필요한 건 아래 동작 단위로 막는다.
  @UseGuards(OptionalJwtAuthGuard)
  @Get('qt-shares')
  findQtShares(
    @CurrentUser() user: JwtPayload | undefined,
    @Query() query: FindQtSharesDto,
  ) {
    return this.postsService.findQtShares(user?.sub, query.month);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('qt-shares/:id')
  findQtShare(
    @CurrentUser() user: JwtPayload | undefined,
    @Param('id') id: string,
  ) {
    return this.postsService.findQtShare(id, user?.sub);
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
