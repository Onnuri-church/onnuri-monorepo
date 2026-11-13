import type { ReportReason, ReportTargetType } from '@onnuri/shared';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

// 백엔드는 shared에서 타입만 가져온다 — 검증용 배열은 여기 두고 satisfies로 맞춘다 (dev-login.dto 참고).
export const REPORT_TARGET_TYPES = [
  'POST',
  'COMMENT',
  'CHAT_MESSAGE',
  'TEAM_BOARD_POST',
  'TEAM_BOARD_COMMENT',
] as const satisfies readonly ReportTargetType[];

export const REPORT_REASONS = [
  'ABUSE',
  'SEXUAL',
  'SPAM',
  'PRIVACY',
  'OTHER',
] as const satisfies readonly ReportReason[];

export class CreateReportDto {
  @IsIn(REPORT_TARGET_TYPES)
  targetType: ReportTargetType;

  @IsString()
  @MaxLength(50)
  targetId: string;

  @IsIn(REPORT_REASONS)
  reason: ReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  detail?: string;
}
