import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { CellAccessService } from './cell-access.service';
import { CellAttendanceController } from './cell-attendance.controller';
import { CellAttendanceService } from './cell-attendance.service';
import { CellExpiryService } from './cell-expiry.service';
import { CellGalleryController } from './cell-gallery.controller';
import { CellGalleryService } from './cell-gallery.service';
import { CellsController } from './cells.controller';
import { CellsService } from './cells.service';
import { FollowerNotesController } from './follower-notes.controller';
import { FollowerNotesService } from './follower-notes.service';

@Module({
  imports: [NotificationsModule],
  controllers: [
    CellsController,
    FollowerNotesController,
    CellAttendanceController,
    CellGalleryController,
  ],
  providers: [
    CellAccessService,
    CellsService,
    FollowerNotesService,
    CellAttendanceService,
    CellExpiryService,
    CellGalleryService,
  ],
  exports: [CellAccessService],
})
export class CellsModule {}
