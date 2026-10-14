import { IsIn, IsOptional, IsString } from 'class-validator';
import { IsYmdDate } from '../../../common/validators/is-ymd-date';

// GET /admin/download 쿼리 — 데이터 다운로드 화면의 세 질문(종류/대상/기간) 그대로.
// period=custom이면 from/to가 필수, scope가 cell/team이면 groupId가 필수 (서비스 검증).
export class FindAdminDownloadDto {
  @IsIn(['member', 'attendance', 'both'])
  kind!: 'member' | 'attendance' | 'both';

  @IsOptional()
  @IsIn(['all', 'cell', 'team'])
  scope?: 'all' | 'cell' | 'team';

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsIn(['all', 'thisYear', 'lastYear', 'custom'])
  period?: 'all' | 'thisYear' | 'lastYear' | 'custom';

  @IsOptional()
  @IsYmdDate()
  from?: string;

  @IsOptional()
  @IsYmdDate()
  to?: string;
}
