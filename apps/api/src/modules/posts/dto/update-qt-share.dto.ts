import { IsStorageUrl } from '../../../common/validators/is-storage-url';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

import { QT_SHARE_MAX_IMAGES } from './create-qt-share.dto';
import { IsYmdDate } from '../../../common/validators/is-ymd-date';

// PATCH /posts/qt-shares/:id 요청 본문 — 계약은 @onnuri/shared의 UpdateQtShareRequest.
// 보낸 항목만 바꾼다. @nestjs/mapped-types의 PartialType을 쓰려면 의존성이 하나 늘어서,
// 항목이 6개뿐인 지금은 그냥 적는다.
export class UpdateQtShareDto {
  @IsOptional()
  @IsISO8601({ strict: true })
  @IsYmdDate()
  eventDate?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: '제목은 100자까지 쓸 수 있어요.' })
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000, { message: '내용은 5000자까지 쓸 수 있어요.' })
  content?: string;

  // 생략(undefined)은 "그대로 두기", null은 "지우기"다 — IsOptional이 둘 다 통과시킨다.
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '말씀 구절은 200자까지 쓸 수 있어요.' })
  passage?: string | null;

  @IsOptional()
  @IsUrl()
  @IsStorageUrl()
  coverImageUrl?: string | null;

  // 보내면 기존 본문사진을 통째로 이 목록으로 바꾼다 (빈 배열이면 전부 지운다).
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(QT_SHARE_MAX_IMAGES)
  @IsUrl({}, { each: true })
  @IsStorageUrl({ each: true })
  imageUrls?: string[];

  // 익명 여부 바꾸기 — 생략하면 그대로 둔다.
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}
