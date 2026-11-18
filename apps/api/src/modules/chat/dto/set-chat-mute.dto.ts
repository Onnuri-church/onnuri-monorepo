import { IsBoolean } from 'class-validator';

// PUT /chats/:kind/:id/mute — 이 방 알림 끄기·켜기 (SCRUM-230)
export class SetChatMuteDto {
  @IsBoolean()
  muted!: boolean;
}
