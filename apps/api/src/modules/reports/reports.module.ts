import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import {
  AdminReportsController,
  ReportsController,
} from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [NotificationsModule],
  controllers: [ReportsController, AdminReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
