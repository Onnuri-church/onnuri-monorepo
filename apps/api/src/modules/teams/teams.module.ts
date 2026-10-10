import { Module } from '@nestjs/common';

import { TeamGalleryController } from './team-gallery.controller';
import { TeamGalleryService } from './team-gallery.service';
import { TeamMembersController } from './team-members.controller';
import { TeamMembersService } from './team-members.service';
import { TeamMessagesController } from './team-messages.controller';
import { TeamMessagesService } from './team-messages.service';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
  controllers: [
    TeamGalleryController,
    TeamMembersController,
    TeamMessagesController,
    TeamsController,
  ],
  providers: [
    TeamGalleryService,
    TeamMembersService,
    TeamMessagesService,
    TeamsService,
  ],
})
export class TeamsModule {}
