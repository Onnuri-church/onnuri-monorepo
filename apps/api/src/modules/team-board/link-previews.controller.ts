import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LinkPreviewsService } from './link-previews.service';

// GET /link-previews?url=… — 글에 붙은 링크의 미리보기 (제목·썸네일). 지원하지 않는 주소는 null.
@UseGuards(JwtAuthGuard)
@Controller('link-previews')
export class LinkPreviewsController {
  constructor(private readonly linkPreviewsService: LinkPreviewsService) {}

  @Get()
  async find(@Query('url') url?: string) {
    if (!url) throw new BadRequestException('url이 필요해요.');
    return (await this.linkPreviewsService.find(url)) ?? null;
  }
}
