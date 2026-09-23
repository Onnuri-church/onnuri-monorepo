import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

// POST /notices/banners 요청 본문 — passage(말씀 배너)나 imageUrl(포스터 배너) 중
// 하나는 있어야 한다 (둘 다 없는 경우는 서비스가 400으로 거른다).
export class CreateBannerDto {
  @IsString()
  @IsNotEmpty({ message: '제목을 입력해주세요.' })
  title!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: '성경 구절을 입력해주세요.' })
  passage?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  imageUrl?: string;
}
