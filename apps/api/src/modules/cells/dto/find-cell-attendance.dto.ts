import { Matches } from 'class-validator';

// GET /cells/:id/attendance 쿼리.
export class FindCellAttendanceDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date는 YYYY-MM-DD 형식이어야 합니다.',
  })
  date!: string;
}
