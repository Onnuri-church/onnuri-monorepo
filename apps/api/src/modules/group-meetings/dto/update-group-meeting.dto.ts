import { IsStorageUrl } from '../../../common/validators/is-storage-url';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsYmdDate } from '../../../common/validators/is-ymd-date';

// PATCH /group-meetings/:id 요청 본문 — 보낸 필드만 반영.
// leaderIds는 전체 교체: 빠진 기존 소그룹장은 일반 참여자(MEMBER)로 남는다.
export class UpdateGroupMeetingDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '제목은 100자까지 쓸 수 있어요.' })
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: '설명은 5000자까지 쓸 수 있어요.' })
  description?: string;

  @IsOptional()
  @IsYmdDate()
  recruitStart?: string;

  @IsOptional()
  @IsYmdDate()
  recruitEnd?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: '모임일을 입력해주세요.' })
  @MaxLength(100, { message: '모임일은 100자까지 쓸 수 있어요.' })
  schedule?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '장소는 100자까지 쓸 수 있어요.' })
  place?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '비용은 100자까지 쓸 수 있어요.' })
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
  @IsStorageUrl()
  coverImageUrl?: string | null;
}
