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
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateCellNewsDto } from './dto/create-cell-news.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { FindCellNewsDto } from './dto/find-cell-news.dto';
import { FindQtSharesDto } from './dto/find-qt-shares.dto';
import { PostsService } from './posts.service';

// 게시판별 엔드포인트를 먼저 두고 :id 라우트를 뒤에 둔다 — 나중에 GET /posts/:id(상세)가
// 생겼을 때 순서가 뒤집혀 있으면 :id가 'qt-shares'를 게시글 ID로 먹는다.
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

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
  @Delete('cell-news/:id')
  deleteCellNews(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.postsService.deleteCellNews(id, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/comments')
  addComment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.postsService.addComment(id, user.sub, dto.content);
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
