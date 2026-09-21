import { IsOptional, IsString, Matches } from 'class-validator';

// PATCH /cells/:id 요청 본문 (관리자 전용) — 보낸 필드만 반영한다.
// viceLeaderId는 "필드 생략 = 유지, null = 부셀장 해제"로 구분한다 (부셀장 체크 해제 시안).
export class UpdateCellDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  leaderId?: string;

  @IsOptional()
  @IsString()
  viceLeaderId?: string | null;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'expiresAt은 YYYY-MM-DD 형식이어야 합니다.',
  })
  expiresAt?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string | null;
}
