import { IsIn } from 'class-validator';
import { CHAT_EMOJIS } from '@onnuri/shared';

// PUT …/messages/:id/reactions 요청 본문 — 허용 이모지만 받는다.
export class ToggleChatReactionDto {
  @IsIn([...CHAT_EMOJIS], { message: '사용할 수 없는 이모지예요.' })
  emoji!: string;
}
