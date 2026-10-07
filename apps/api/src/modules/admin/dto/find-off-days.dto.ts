import { IsOptional, Matches } from 'class-validator';

// GET /admin/off-days 쿼리 — month 생략 시 이번 달.
export class FindOffDaysDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month는 YYYY-MM 형식이어야 합니다.' })
  month?: string;
}
