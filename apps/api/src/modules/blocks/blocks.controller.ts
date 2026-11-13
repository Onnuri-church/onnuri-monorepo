import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { BlocksService } from './blocks.service';
import { CreateBlockDto } from './dto/create-block.dto';

// 내 차단 목록 (SCRUM-198) — 설정 > 차단 목록, 글·댓글·채팅의 "차단하기".
@UseGuards(JwtAuthGuard)
@Controller('users/me/blocks')
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  @Get()
  findMine(@CurrentUser() user: JwtPayload) {
    return this.blocksService.findMine(user.sub);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post()
  block(@CurrentUser() user: JwtPayload, @Body() dto: CreateBlockDto) {
    return this.blocksService.block(user.sub, dto.userId);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':userId')
  unblock(@CurrentUser() user: JwtPayload, @Param('userId') userId: string) {
    return this.blocksService.unblock(user.sub, userId);
  }
}
