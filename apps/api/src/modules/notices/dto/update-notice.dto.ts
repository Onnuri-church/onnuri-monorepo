import { IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

// PATCH /notices/:id 요청 본문 — 등록 화면이 모든 항목을 채워 보내는 계약이라 전체 교체다.
// content·imageUrl의 null은 "비움"이고, 둘 다 비면 서버가 거부한다 (등록과 같은 규칙).
export class UpdateNoticeDto {
  @IsString()
  @IsNotEmpty({ message: '제목을 입력해주세요.' })
  title!: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  content?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  imageUrl?: string | null;
}
