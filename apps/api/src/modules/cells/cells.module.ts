import { Module } from '@nestjs/common';

import { CellsController } from './cells.controller';
import { CellsService } from './cells.service';
import { FollowerNotesController } from './follower-notes.controller';
import { FollowerNotesService } from './follower-notes.service';

@Module({
  controllers: [CellsController, FollowerNotesController],
  providers: [CellsService, FollowerNotesService],
})
export class CellsModule {}
