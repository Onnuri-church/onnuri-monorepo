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
import { CreatePrayerDto } from './dto/create-prayer.dto';
import { FindPrayersDto } from './dto/find-prayers.dto';
import { UpdatePrayerDto } from './dto/update-prayer.dto';
import { PrayersService } from './prayers.service';

// 기도제목 게시판 — 열람은 게스트도 된다 (게스트 열람 범위 확정: 팔로워 노트·출석·셀원 관리 빼고 전부).
// 익명 글 실명 노출·남의 글 삭제는 서비스가 관리자 여부를 DB에서 확인해 가른다.
// 'mine'/'bookmarked'가 ':id'보다 먼저 와야 한다 — Express는 등록 순서로 매칭한다.
@Controller('posts/prayers')
export class PrayersController {
  constructor(private readonly prayersService: PrayersService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  findAll(
    @CurrentUser() user: JwtPayload | undefined,
    @Query() query: FindPrayersDto,
  ) {
    return this.prayersService.findAll(user?.sub, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  findMine(@CurrentUser() user: JwtPayload, @Query() query: FindPrayersDto) {
    return this.prayersService.findMine(user.sub, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('bookmarked')
  findBookmarked(
    @CurrentUser() user: JwtPayload,
    @Query() query: FindPrayersDto,
  ) {
    return this.prayersService.findBookmarked(user.sub, query);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  findOne(
    @CurrentUser() user: JwtPayload | undefined,
    @Param('id') id: string,
  ) {
    return this.prayersService.findOne(id, user?.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePrayerDto) {
    return this.prayersService.create(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePrayerDto,
  ) {
    return this.prayersService.update(id, user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.prayersService.remove(id, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(':id/bookmarks')
  bookmark(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.prayersService.bookmark(id, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id/bookmarks')
  unbookmark(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.prayersService.unbookmark(id, user.sub);
  }
}
