import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

// POST /teams 요청 본문 (관리자 전용) — 팀 생성 폼(팀 이름/팀장/배경사진/한 줄 소개/팀 소개).
// 아이콘은 폼에 없다 — 시안의 팀 아이콘 7종이 고정이라 시드가 넣은 값을 그대로 쓴다.
export class CreateTeamDto {
  @IsString()
  @IsNotEmpty({ message: '팀 이름을 입력해주세요.' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: '팀장을 선택해주세요.' })
  leaderId!: string;

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
