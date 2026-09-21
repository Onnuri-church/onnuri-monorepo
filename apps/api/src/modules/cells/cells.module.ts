import { Module } from '@nestjs/common';

import { CellAttendanceController } from './cell-attendance.controller';
import { CellAttendanceService } from './cell-attendance.service';
import { CellsController } from './cells.controller';
import { CellsService } from './cells.service';
import { FollowerNotesController } from './follower-notes.controller';
import { FollowerNotesService } from './follower-notes.service';

@Module({
  controllers: [CellsController, FollowerNotesController, CellAttendanceController],
  providers: [CellsService, FollowerNotesService, CellAttendanceService],
})
export class CellsModule {}
