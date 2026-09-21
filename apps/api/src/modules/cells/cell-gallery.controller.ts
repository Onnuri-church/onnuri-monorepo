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
import { CellGalleryService } from './cell-gallery.service';
import { AddGalleryPhotoDto } from './dto/add-gallery-photo.dto';
import { RemoveGalleryPhotosDto } from './dto/remove-gallery-photos.dto';

// 갤러리 열람은 게스트도 된다 (셀 페이지 열람 범위). 업로드는 그 셀 셀원·관리자,
// 삭제는 셀장/부셀장·관리자 (검증은 서비스).
@Controller('cells/:cellId/gallery')
export class CellGalleryController {
  constructor(private readonly cellGalleryService: CellGalleryService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  findAll(@Param('cellId') cellId: string) {
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
