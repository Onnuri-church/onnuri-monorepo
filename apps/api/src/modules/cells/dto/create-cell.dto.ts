import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

// POST /cells 요청 본문 (관리자 전용) — 셀 생성 폼(배경사진/셀장/부셀장/셀이름/활동기간).
// 커버 사진은 업로드 인프라가 아직 없어 URL을 그대로 받는다 (업로드 API가 생기면 그 결과 URL).
export class CreateCellDto {
  @IsString()
  @IsNotEmpty({ message: '셀 이름을 입력해주세요.' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: '셀장을 선택해주세요.' })
  leaderId!: string;

  @IsOptional()
  @IsString()
  viceLeaderId?: string | null;

  // 활동기간 = 셀 턴 종료일 하나 (2026-09-21 시안 확정)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'expiresAt은 YYYY-MM-DD 형식이어야 합니다.',
  })
  expiresAt!: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string | null;
}
