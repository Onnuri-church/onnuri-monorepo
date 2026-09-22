import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

// PATCH /group-meetings/:id 요청 본문 — 보낸 필드만 반영.
// leaderIds는 전체 교체: 빠진 기존 소그룹장은 일반 참여자(MEMBER)로 남는다.
export class UpdateGroupMeetingDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  recruitStart?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  recruitEnd?: string;

  @IsOptional()
  @IsString()
  place?: string;

  @IsOptional()
  @IsString()
  cost?: string;

  // 모집 상태 수동 전환 (모집중/마감 필터의 마감 처리)
  @IsOptional()
  @IsIn(['open', 'closed'])
  status?: 'open' | 'closed';

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: '소그룹장을 한 명 이상 지정해주세요.' })
  @IsString({ each: true })
  leaderIds?: string[];

  // "생략 = 유지, null = 사진 제거"
  @IsOptional()
  @IsString()
  coverImageUrl?: string | null;
}
