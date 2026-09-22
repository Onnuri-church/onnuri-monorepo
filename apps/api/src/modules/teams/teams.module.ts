import { Module } from '@nestjs/common';

import { TeamGalleryController } from './team-gallery.controller';
import { TeamGalleryService } from './team-gallery.service';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
  controllers: [TeamGalleryController, TeamsController],
  providers: [TeamGalleryService, TeamsService],
})
export class TeamsModule {}
