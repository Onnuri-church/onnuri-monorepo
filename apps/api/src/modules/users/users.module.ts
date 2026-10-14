import { Module } from '@nestjs/common';

import { UploadsModule } from '../uploads/uploads.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  // 아바타 교체 시 옛 파일 정리에 UploadsService를 쓴다.
  imports: [UploadsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
