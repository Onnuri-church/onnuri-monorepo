import { ArrayMinSize, ArrayUnique, IsArray, IsString } from 'class-validator';

// POST /cells/:id/members 요청 본문 — 셀에 넣을 회원 id들 (관리자 전용).
export class AddCellMembersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  userIds!: string[];
}
