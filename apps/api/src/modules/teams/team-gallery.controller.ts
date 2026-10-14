import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { AddTeamGalleryPhotoDto } from './dto/add-gallery-photo.dto';
import { RemoveTeamGalleryPhotosDto } from './dto/remove-gallery-photos.dto';
import { TeamGalleryService } from './team-gallery.service';

// 갤러리 열람은 게스트도 된다 (팀스토리 열람 범위). 추가·삭제는 그 팀 팀장·관리자 (검증은 서비스).
@Controller('teams/:teamId/gallery')
export class TeamGalleryController {
  constructor(private readonly teamGalleryService: TeamGalleryService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  findAll(@Param('teamId') teamId: string) {
    return this.teamGalleryService.findAll(teamId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  add(
    @CurrentUser() user: JwtPayload,
    @Param('teamId') teamId: string,
    @Body() dto: AddTeamGalleryPhotoDto,
  ) {
    return this.teamGalleryService.add(user.sub, teamId, dto.url);
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('teamId') teamId: string,
    @Body() dto: RemoveTeamGalleryPhotosDto,
  ) {
    return this.teamGalleryService.remove(user.sub, teamId, dto.imageIds);
  }
}
