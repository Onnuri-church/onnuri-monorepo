import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import type { PrayerCategoryValue } from '@onnuri/shared';

import { PRAYER_CATEGORIES } from './create-prayer.dto';

// PATCH /posts/prayers/:id 요청 본문 — 보낸 필드만 반영, imageUrls는 전체 교체.
export class UpdatePrayerDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: '기도제목을 입력해주세요.' })
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: '내용을 입력해주세요.' })
  content?: string;

  @IsOptional()
  @IsIn(PRAYER_CATEGORIES, { message: '카테고리를 선택해주세요.' })
  category?: PrayerCategoryValue;

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'visibleUntil은 YYYY-MM-DD 형식이어야 합니다.',
  })
  visibleUntil?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5, { message: '사진은 최대 5장까지 올릴 수 있어요.' })
  @IsString({ each: true })
  imageUrls?: string[];
}
