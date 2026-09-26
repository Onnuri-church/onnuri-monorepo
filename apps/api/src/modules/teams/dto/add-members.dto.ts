import { ArrayMinSize, IsArray, IsString } from 'class-validator';

// POST /teams/:id/members 요청 본문 — 팀원 추가 화면에서 고른 사람들.
export class AddTeamMembersDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  userIds!: string[];
}
