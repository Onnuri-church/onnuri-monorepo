import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

// GET /admin/attendance 쿼리 — scope가 cell/team이면 groupId(셀/팀 id)가 필수다 (서비스 검증).
export class FindAdminAttendanceDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month는 YYYY-MM 형식이어야 합니다.' })
  month?: string;

  @IsOptional()
  @IsIn(['all', 'cell', 'team'])
  scope?: 'all' | 'cell' | 'team';

  @IsOptional()
  @IsString()
  groupId?: string;
}
