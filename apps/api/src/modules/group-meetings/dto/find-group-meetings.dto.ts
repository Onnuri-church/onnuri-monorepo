import { IsIn, IsOptional, IsString } from 'class-validator';

// GET /group-meetings 쿼리 — status를 안 주면 모집중이다 (마감이 계속 쌓여서 기본은 지금 신청할 수 있는 모임).
export class FindGroupMeetingsDto {
  @IsOptional()
  @IsIn(['open', 'closed'])
  status?: 'open' | 'closed';

  // 이전 쪽 응답의 nextCursor
  @IsOptional()
  @IsString()
  cursor?: string;
}
