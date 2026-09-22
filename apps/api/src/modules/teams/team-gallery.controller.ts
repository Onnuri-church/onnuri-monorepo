import { Controller, Get, Param, UseGuards } from '@nestjs/common';

import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { TeamGalleryService } from './team-gallery.service';

@Controller('teams/:teamId/gallery')
export class TeamGalleryController {
  constructor(private readonly teamGalleryService: TeamGalleryService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  findAll(@Param('teamId') teamId: string) {
    return this.teamGalleryService.findAll(teamId);
  }
}
