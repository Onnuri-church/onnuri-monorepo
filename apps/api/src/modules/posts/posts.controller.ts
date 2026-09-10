import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FindQtSharesDto } from './dto/find-qt-shares.dto';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('qt-shares')
  findQtShares(@Query() query: FindQtSharesDto) {
    return this.postsService.findQtShares(query.month);
  }
}
