import { IsOptional, IsString } from 'class-validator';

// PATCH /teams/:id 요청 본문 (관리자 전용) — 보낸 필드만 반영한다.
export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  leaderId?: string;

  @IsOptional()
  @IsString()
  tagline?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  coverImageUrl?: string | null;
}
