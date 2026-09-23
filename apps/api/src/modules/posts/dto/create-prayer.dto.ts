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

export const PRAYER_CATEGORIES: PrayerCategoryValue[] = [
  'PERSONAL_SPIRITUAL',
  'HEALTH_DAILY',
  'RELATIONSHIP_COMMUNITY',
  'INTERCESSION_SERVICE',
  'OTHER',
];

// POST /posts/prayers 요청 본문 — 작성 시안(익명 토글/제목/카테고리/공개기간/사진/내용).
export class CreatePrayerDto {
  @IsString()
  @IsNotEmpty({ message: '기도제목을 입력해주세요.' })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: '내용을 입력해주세요.' })
  content!: string;

  @IsIn(PRAYER_CATEGORIES, { message: '카테고리를 선택해주세요.' })
  category!: PrayerCategoryValue;

  @IsBoolean()
  isAnonymous!: boolean;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'visibleUntil은 YYYY-MM-DD 형식이어야 합니다.',
  })
  visibleUntil!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5, { message: '사진은 최대 5장까지 올릴 수 있어요.' })
  @IsString({ each: true })
  imageUrls?: string[];
}
