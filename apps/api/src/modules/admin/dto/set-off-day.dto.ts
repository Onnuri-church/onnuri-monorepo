import { IsBoolean, IsIn, IsOptional } from 'class-validator';

import type { OffDayKind } from '@onnuri/shared';

// PUT /admin/off-days/:date 본문 — kind가 null이면 지정 해제.
export class SetOffDayDto {
  @IsOptional()
  @IsIn(['WORSHIP_OFF', 'CELL_MEETING_OFF', 'BOTH_OFF'])
  kind!: OffDayKind | null;

  @IsOptional()
  @IsBoolean()
  confirm?: boolean;
}
