import { Module } from '@nestjs/common';

import { MetricsRecorderService } from './metrics-recorder.service';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Module({
  controllers: [MetricsController],
  providers: [MetricsService, MetricsRecorderService],
  exports: [MetricsRecorderService],
})
export class MetricsModule {}
