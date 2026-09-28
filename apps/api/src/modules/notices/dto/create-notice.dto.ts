import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

// POST /notices 요청 본문 — 내용(content)이나 이미지 중 하나는 있어야 한다 (서비스가 400으로 거른다).
export class CreateNoticeDto {
  @IsString()
  @IsNotEmpty({ message: '제목을 입력해주세요.' })
  title!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: '내용을 입력해주세요.' })
  content?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  imageUrl?: string;
}
