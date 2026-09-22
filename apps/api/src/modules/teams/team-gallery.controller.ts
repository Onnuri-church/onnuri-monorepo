import { Controller, Get, Param, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TeamGalleryService } from './team-gallery.service';

@Controller('teams/:teamId/gallery')
export class TeamGalleryController {
  constructor(private readonly teamGalleryService: TeamGalleryService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Param('teamId') teamId: string) {
    return this.teamGalleryService.findAll(teamId);
  }
}
