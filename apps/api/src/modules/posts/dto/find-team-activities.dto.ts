import { IsOptional, IsString } from 'class-validator';

// GET /posts/team-activities 쿼리 — 상단 팀 필터 칩이 쓴다.
// 생략하면 전체 팀의 글을 최신순으로 준다("전체" 칩).
export class FindTeamActivitiesDto {
  @IsOptional()
  @IsString()
  teamId?: string;
}
