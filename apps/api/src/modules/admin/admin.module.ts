import { Module } from '@nestjs/common';

import { AdminAttendanceService } from './admin-attendance.service';
import { AdminDownloadService } from './admin-download.service';
import { AdminFollowerNotesService } from './admin-follower-notes.service';
import { AdminOffDaysService } from './admin-off-days.service';
import { AdminController } from './admin.controller';

@Module({
  controllers: [AdminController],
  providers: [
    AdminAttendanceService,
    AdminDownloadService,
    AdminFollowerNotesService,
    AdminOffDaysService,
  ],
})
export class AdminModule {}
