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
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CellAccessService } from './cell-access.service';
import { CellGalleryService } from './cell-gallery.service';
import { AddGalleryPhotoDto } from './dto/add-gallery-photo.dto';
import { RemoveGalleryPhotosDto } from './dto/remove-gallery-photos.dto';

// 갤러리 열람·업로드는 그 셀 셀원·관리자만 (열람은 컨트롤러, 업로드는 서비스가 검증),
// 삭제는 셀장/부셀장·관리자 (검증은 서비스).
@Controller('cells/:cellId/gallery')
export class CellGalleryController {
  constructor(
    private readonly cellGalleryService: CellGalleryService,
    private readonly cellAccess: CellAccessService,
  ) {}

  // 열람은 그 셀 셀원·관리자만 (2026-10-18 확정 — 이전엔 게스트도 됐다).
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Param('cellId') cellId: string,
  ) {
    await this.cellAccess.assertCanView(user.sub, cellId);
    return this.cellGalleryService.findAll(cellId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  add(
    @CurrentUser() user: JwtPayload,
    @Param('cellId') cellId: string,
    @Body() dto: AddGalleryPhotoDto,
  ) {
    return this.cellGalleryService.add(user.sub, cellId, dto.url);
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('cellId') cellId: string,
    @Body() dto: RemoveGalleryPhotosDto,
  ) {
    return this.cellGalleryService.remove(user.sub, cellId, dto.imageIds);
  }
}
