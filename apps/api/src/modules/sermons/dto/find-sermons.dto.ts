import { IsOptional, Matches } from 'class-validator';

// GET /sermons 쿼리 — month는 응답의 SermonMonth.value를 그대로 돌려받는 형식이다.
// 생략하면 영상이 있는 가장 최근 달을 쓴다.
export class FindSermonsDto {
  @IsOptional()
  @Matches(/^\d{4}\.\d{2}$/, { message: 'month는 YYYY.MM 형식이어야 합니다.' })
  month?: string;
}
