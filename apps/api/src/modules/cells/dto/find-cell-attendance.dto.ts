import { IsYmdDate } from '../../../common/validators/is-ymd-date';

// GET /cells/:id/attendance 쿼리.
export class FindCellAttendanceDto {
  @IsYmdDate({ message: 'date는 YYYY-MM-DD 형식이어야 합니다.' })
  date!: string;
}
