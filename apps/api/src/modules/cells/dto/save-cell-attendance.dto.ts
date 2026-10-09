import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { IsYmdDate } from '../../../common/validators/is-ymd-date';

export class AttendanceRecordDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsBoolean()
  worship!: boolean;

  @IsBoolean()
  meeting!: boolean;
}

// PUT /cells/:id/attendance 요청 본문 — 등록하기 일괄 저장 (시안: 예배/셀모임 토글 후 등록).
export class SaveCellAttendanceDto {
  @IsYmdDate({ message: 'date는 YYYY-MM-DD 형식이어야 합니다.' })
  date!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  records!: AttendanceRecordDto[];
}
