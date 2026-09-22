import { Module } from '@nestjs/common';

import { AdminAttendanceService } from './admin-attendance.service';
import { AdminController } from './admin.controller';

@Module({
  controllers: [AdminController],
  providers: [AdminAttendanceService],
})
export class AdminModule {}
