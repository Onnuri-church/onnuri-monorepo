import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { TeamFollowerNotesController } from './team-follower-notes.controller';
import { TeamFollowerNotesService } from './team-follower-notes.service';
import { TeamGalleryController } from './team-gallery.controller';
import { TeamGalleryService } from './team-gallery.service';
import { TeamMembersController } from './team-members.controller';
import { TeamMembersService } from './team-members.service';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
  imports: [NotificationsModule],
  controllers: [
    TeamFollowerNotesController,
    TeamGalleryController,
    TeamMembersController,
    TeamsController,
  ],
  providers: [
    TeamFollowerNotesService,
    TeamGalleryService,
    TeamMembersService,
    TeamsService,
  ],
})
export class TeamsModule {}
