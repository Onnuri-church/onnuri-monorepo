import { IsBoolean, IsOptional } from 'class-validator';

// PATCH /users/me/notification-settings 요청 본문 — 보낸 필드만 반영.
export class UpdateNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  sermonUpload?: boolean;

  @IsOptional()
  @IsBoolean()
  liveWorship?: boolean;

  @IsOptional()
  @IsBoolean()
  qtNewPost?: boolean;
}
