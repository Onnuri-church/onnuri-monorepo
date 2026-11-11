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
  ValidateIf,
} from 'class-validator';
import { IsYmdDate } from '../../../common/validators/is-ymd-date';

// 작성 화면의 "본문사진(최대 5장)"과 같은 값.
export const QT_SHARE_MAX_IMAGES = 5;

// POST /posts/qt-shares 요청 본문 — 계약은 @onnuri/shared의 CreateQtShareRequest.
// 사진은 URL로만 받는다 (파일 업로드는 POST /uploads/images가 먼저 처리한다).
export class CreateQtShareDto {
  // YYYY-MM-DD만 받는다 — Matches가 시각 붙은 ISO 문자열을 거르고,
  // strict가 2월 31일처럼 존재하지 않는 날짜를 거른다 (UpdateMyProfileDto와 같은 방식).
  @IsISO8601({ strict: true })
  @IsYmdDate()
  eventDate!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: '제목은 100자까지 쓸 수 있어요.' })
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000, { message: '내용은 5000자까지 쓸 수 있어요.' })
  content!: string;

  // 말씀 구절은 비워둘 수 있다 — 안 적었으면 null로 온다.
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(200, { message: '말씀 구절은 200자까지 쓸 수 있어요.' })
  passage!: string | null;

  @ValidateIf((_, value) => value !== null)
  @IsUrl()
  @IsStorageUrl()
  coverImageUrl!: string | null;

  @IsArray()
  @ArrayMaxSize(QT_SHARE_MAX_IMAGES)
  @IsUrl({}, { each: true })
  @IsStorageUrl({ each: true })
  imageUrls!: string[];

  // 익명으로 쓰기 — 생략하면 기명이다 (옛 앱 호환).
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}
