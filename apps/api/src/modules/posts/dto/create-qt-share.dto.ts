import {
  ArrayMaxSize,
  IsArray,
  IsISO8601,
  IsNotEmpty,
  IsString,
  IsUrl,
  Matches,
  ValidateIf,
} from 'class-validator';

// 작성 화면의 "본문사진(최대 5장)"과 같은 값.
export const QT_SHARE_MAX_IMAGES = 5;

// POST /posts/qt-shares 요청 본문 — 계약은 @onnuri/shared의 CreateQtShareRequest.
// 사진은 URL로만 받는다 (파일 업로드는 POST /uploads/images가 먼저 처리한다).
export class CreateQtShareDto {
  // YYYY-MM-DD만 받는다 — Matches가 시각 붙은 ISO 문자열을 거르고,
  // strict가 2월 31일처럼 존재하지 않는 날짜를 거른다 (UpdateMyProfileDto와 같은 방식).
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  eventDate!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  // 말씀 구절은 비워둘 수 있다 — 안 적었으면 null로 온다.
  @ValidateIf((_, value) => value !== null)
  @IsString()
  passage!: string | null;

  @ValidateIf((_, value) => value !== null)
  @IsUrl()
  coverImageUrl!: string | null;

  @IsArray()
  @ArrayMaxSize(QT_SHARE_MAX_IMAGES)
  @IsUrl({}, { each: true })
  imageUrls!: string[];
}
