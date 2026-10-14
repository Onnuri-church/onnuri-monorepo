import { Module } from '@nestjs/common';

import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  controllers: [UploadsController],
  providers: [UploadsService],
  // 아바타 교체 시 옛 파일 정리(users 모듈)에서 쓴다.
  exports: [UploadsService],
})
export class UploadsModule {}
