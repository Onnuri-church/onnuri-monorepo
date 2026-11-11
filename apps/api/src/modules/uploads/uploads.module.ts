import { Module } from '@nestjs/common';

import { UploadsController } from './uploads.controller';
import { StorageUrlService } from './storage-url.service';
import { UploadsService } from './uploads.service';

@Module({
  controllers: [UploadsController],
  providers: [UploadsService, StorageUrlService],
  // 아바타 교체 시 옛 파일 정리(users 모듈)에서 쓴다.
  // StorageUrlService는 전역 인터셉터(app.module)가 쓴다 — 사진 링크 서명 (SCRUM-167).
  exports: [UploadsService, StorageUrlService],
})
export class UploadsModule {}
