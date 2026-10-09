import {
  ArrayMaxSize,
  IsArray,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
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
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  content?: string;

  // 생략(undefined)은 "그대로 두기", null은 "지우기"다 — IsOptional이 둘 다 통과시킨다.
  @IsOptional()
  @IsString()
  passage?: string | null;

  @IsOptional()
  @IsUrl()
  coverImageUrl?: string | null;

  // 보내면 기존 본문사진을 통째로 이 목록으로 바꾼다 (빈 배열이면 전부 지운다).
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(QT_SHARE_MAX_IMAGES)
  @IsUrl({}, { each: true })
  imageUrls?: string[];
}
