import { Module } from '@nestjs/common';

import { CellAttendanceController } from './cell-attendance.controller';
import { CellAttendanceService } from './cell-attendance.service';
import { CellGalleryController } from './cell-gallery.controller';
import { CellGalleryService } from './cell-gallery.service';
import { CellsController } from './cells.controller';
import { CellsService } from './cells.service';
import { FollowerNotesController } from './follower-notes.controller';
import { FollowerNotesService } from './follower-notes.service';

@Module({
  controllers: [
    CellsController,
    FollowerNotesController,
    CellAttendanceController,
    CellGalleryController,
  ],
  providers: [
    CellsService,
    FollowerNotesService,
    CellAttendanceService,
    CellGalleryService,
  ],
})
export class CellsModule {}
