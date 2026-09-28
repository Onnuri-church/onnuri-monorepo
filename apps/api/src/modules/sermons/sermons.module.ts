import { Module } from '@nestjs/common';

import { SermonSyncService } from './sermon-sync.service';
import { SermonsController } from './sermons.controller';
import { SermonsService } from './sermons.service';

@Module({
  controllers: [SermonsController],
  providers: [SermonsService, SermonSyncService],
})
export class SermonsModule {}
