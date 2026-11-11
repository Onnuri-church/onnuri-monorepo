import { IsStorageUrl } from '../../../common/validators/is-storage-url';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

// POST /notices/banners 요청 본문 — 제목·성경 구절은 필수, 배경사진(imageUrl)은 선택.
export class CreateBannerDto {
  @IsString()
  @IsNotEmpty({ message: '제목을 입력해주세요.' })
  @MaxLength(100, { message: '제목은 100자까지 쓸 수 있어요.' })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: '성경 구절을 입력해주세요.' })
  @MaxLength(200, { message: '말씀 구절은 200자까지 쓸 수 있어요.' })
  passage!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsStorageUrl()
  imageUrl?: string;
}
