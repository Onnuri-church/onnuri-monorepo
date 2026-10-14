import { Module } from '@nestjs/common';

import { LinkPreviewsController } from './link-previews.controller';
import { LinkPreviewsService } from './link-previews.service';
import { TeamBoardController } from './team-board.controller';
import { TeamBoardService } from './team-board.service';

@Module({
  controllers: [TeamBoardController, LinkPreviewsController],
  providers: [TeamBoardService, LinkPreviewsService],
})
export class TeamBoardModule {}
