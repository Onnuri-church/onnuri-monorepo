import { IsNotEmpty, IsString } from 'class-validator';

// GET /posts/cell-news 쿼리 — 소식은 항상 특정 셀의 것이라 cellId가 필수다.
export class FindCellNewsDto {
  @IsString()
  @IsNotEmpty({ message: 'cellId는 필수입니다.' })
  cellId!: string;
}
