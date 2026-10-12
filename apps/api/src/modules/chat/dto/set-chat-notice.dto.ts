import { IsBoolean } from 'class-validator';

// PUT …/messages/:id/notice 요청 본문 — 공지로 등록(true)·해제(false).
export class SetChatNoticeDto {
  @IsBoolean()
  on!: boolean;
}
