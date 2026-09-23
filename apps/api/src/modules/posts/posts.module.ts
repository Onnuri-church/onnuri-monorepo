import { Module } from '@nestjs/common';

import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { PrayersController } from './prayers.controller';
import { PrayersService } from './prayers.service';

@Module({
  // PrayersController를 앞에 둔다 — 'posts/prayers/…'가 PostsController의 ':id/…'보다
  // 먼저 매칭돼야 한다 (Express는 등록 순서 매칭).
  controllers: [PrayersController, PostsController],
  providers: [PostsService, PrayersService],
})
export class PostsModule {}
