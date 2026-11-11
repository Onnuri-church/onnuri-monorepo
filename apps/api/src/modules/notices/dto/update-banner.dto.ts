import { IsStorageUrl } from '../../../common/validators/is-storage-url';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

// PATCH /notices/banners/:id 요청 본문 — 보낸 필드만 바꾼다. 빈 값은 거부한다.
export class UpdateBannerDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: '제목을 입력해주세요.' })
  @MaxLength(100, { message: '제목은 100자까지 쓸 수 있어요.' })
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: '성경 구절을 입력해주세요.' })
  @MaxLength(200, { message: '말씀 구절은 200자까지 쓸 수 있어요.' })
  passage?: string;

  // null = 배경사진 삭제
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @IsNotEmpty()
  @IsStorageUrl()
  imageUrl?: string | null;
}
