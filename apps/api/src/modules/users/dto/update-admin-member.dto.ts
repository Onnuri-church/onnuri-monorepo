import { IsIn, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

// PATCH /users/:id 요청 본문 (관리자 전용) — 회원 편집 시안의 필드들. 보낸 것만 반영한다.
// cellId/teamId는 "생략 = 유지, null = 소속 없음"으로 구분한다 (UpdateCellDto와 같은 규칙).
export class UpdateAdminMemberDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: '이름은 비울 수 없습니다.' })
  name?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'birthDate는 YYYY-MM-DD 형식이어야 합니다.',
  })
  birthDate?: string;

  @IsOptional()
  @IsIn(['MALE', 'FEMALE'])
  gender?: 'MALE' | 'FEMALE';

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  cellId?: string | null;

  @IsOptional()
  @IsString()
  teamId?: string | null;

  // 관리자(isAdmin) 지정은 앱에서 제외 (2026-09-21 확정) — 선택지에 없다.
  @IsOptional()
  @IsIn(['GENERAL', 'TEAM_LEADER', 'CELL_LEADER'])
  role?: 'GENERAL' | 'TEAM_LEADER' | 'CELL_LEADER';
}
