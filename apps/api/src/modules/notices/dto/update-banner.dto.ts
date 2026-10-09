import { IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

// PATCH /notices/banners/:id 요청 본문 — 보낸 필드만 바꾼다. 빈 값은 거부한다.
export class UpdateBannerDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: '제목을 입력해주세요.' })
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: '성경 구절을 입력해주세요.' })
  passage?: string;

  // null = 배경사진 삭제
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @IsNotEmpty()
  imageUrl?: string | null;
}
