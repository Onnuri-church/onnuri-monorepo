import { ArrayMaxSize, IsArray, IsString, MaxLength } from 'class-validator';
import { IsYmdDate } from '../../../common/validators/is-ymd-date';

export const FOLLOWER_NOTE_ANSWER_MAX = 5000;

// POST /cells/:id/follower-notes 요청 본문 — 3문항 답변 (첫 문항 필수는 서비스에서 검증:
// 배열 요소 단위 검증으로는 "0번째만 필수"를 못 적는다).
export class CreateFollowerNoteDto {
  @IsYmdDate({ message: 'meetingDate는 YYYY-MM-DD 형식이어야 합니다.' })
  meetingDate!: string;

  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  // 문항당 상한 — 길게 쓰는 보고라 넉넉히 둔다 (화면 maxLength와 같다).
  @MaxLength(FOLLOWER_NOTE_ANSWER_MAX, { each: true })
  answers!: string[];
}
