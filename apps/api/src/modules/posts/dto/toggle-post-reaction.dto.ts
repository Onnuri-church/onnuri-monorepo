import { BOARD_EMOJIS } from '@onnuri/shared';
import { IsIn } from 'class-validator';

// PUT /posts/team-activities/:id/reactions 요청 본문 — 팀 게시판과 같은 이모지 목록만 받는다.
export class TogglePostReactionDto {
  @IsIn([...BOARD_EMOJIS], { message: '사용할 수 없는 이모지예요.' })
  emoji!: string;
}
