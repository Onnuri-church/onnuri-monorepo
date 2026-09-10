import {
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
import { FindQtSharesDto } from './dto/find-qt-shares.dto';
import { PostsService } from './posts.service';

// 게시판별 엔드포인트를 먼저 두고 :id 라우트를 뒤에 둔다 — 나중에 GET /posts/:id(상세)가
// 생겼을 때 순서가 뒤집혀 있으면 :id가 'qt-shares'를 게시글 ID로 먹는다.
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('qt-shares')
  findQtShares(@CurrentUser() user: JwtPayload, @Query() query: FindQtSharesDto) {
    return this.postsService.findQtShares(user.sub, query.month);
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
