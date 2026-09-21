import {
  ArrayMaxSize,
  IsArray,
  IsString,
  Matches,
} from 'class-validator';

// POST /cells/:id/follower-notes 요청 본문 — 3문항 답변 (첫 문항 필수는 서비스에서 검증:
// 배열 요소 단위 검증으로는 "0번째만 필수"를 못 적는다).
export class CreateFollowerNoteDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'meetingDate는 YYYY-MM-DD 형식이어야 합니다.',
  })
  meetingDate!: string;

  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  answers!: string[];
}
