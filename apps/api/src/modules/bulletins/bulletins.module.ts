import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { BulletinsController } from './bulletins.controller';
import { BulletinsService } from './bulletins.service';

@Module({
  imports: [NotificationsModule],
  controllers: [BulletinsController],
  providers: [BulletinsService],
})
export class BulletinsModule {}
