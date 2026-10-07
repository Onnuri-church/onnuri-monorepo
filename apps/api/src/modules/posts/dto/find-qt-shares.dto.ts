import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

// GET /posts/qt-shares 쿼리. year·month는 함께 보내는 값이다 — 둘 중 하나라도 없으면
// 글이 있는 가장 최근 달을 서버가 고른다. mine=true면 내 글만(로그인 필요).
export class FindQtSharesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  mine?: boolean;
}
