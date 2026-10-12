import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { IsYmdDate } from '../../../common/validators/is-ymd-date';

// PUT /admin/attendance 요청 본문 — 출석부 칸 하나를 관리자가 대신 고친다.
// worship / meeting 중 보낸 것만 바꾼다 (둘 다 보내도 된다).
export class UpdateAdminAttendanceDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsYmdDate({ message: 'date는 YYYY-MM-DD 형식이어야 합니다.' })
  date!: string;

  @IsOptional()
  @IsBoolean()
  worship?: boolean;

  @IsOptional()
  @IsBoolean()
  meeting?: boolean;
}
