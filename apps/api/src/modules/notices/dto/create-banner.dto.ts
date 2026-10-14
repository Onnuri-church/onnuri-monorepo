import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

// POST /notices/banners 요청 본문 — 제목·성경 구절은 필수, 배경사진(imageUrl)은 선택.
export class CreateBannerDto {
  @IsString()
  @IsNotEmpty({ message: '제목을 입력해주세요.' })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: '성경 구절을 입력해주세요.' })
  passage!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  imageUrl?: string;
}
