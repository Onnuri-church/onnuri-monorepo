import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { SermonSyncService } from './sermon-sync.service';
import { SermonsController } from './sermons.controller';
import { SermonsService } from './sermons.service';

@Module({
  imports: [NotificationsModule],
  controllers: [SermonsController],
  providers: [SermonsService, SermonSyncService],
})
export class SermonsModule {}
