import { IsIn, IsOptional } from 'class-validator';
import type { PrayerCategoryValue } from '@onnuri/shared';

import { PRAYER_CATEGORIES } from './create-prayer.dto';

// GET /posts/prayers(·/mine·/bookmarked) 쿼리 — category 생략은 "전체".
export class FindPrayersDto {
  @IsOptional()
  @IsIn(PRAYER_CATEGORIES)
  category?: PrayerCategoryValue;
}
