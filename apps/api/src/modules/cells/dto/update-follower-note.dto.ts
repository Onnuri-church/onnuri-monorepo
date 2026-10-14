import { ArrayMaxSize, IsArray, IsString } from 'class-validator';

// PATCH /cells/:id/follower-notes/:noteId 요청 본문 — 3문항 답변 전체 교체.
// 셀모임 날짜는 수정하지 않는다 (주간 보고의 정체성이라, 날짜를 바꾸려면 삭제 후 재작성).
export class UpdateFollowerNoteDto {
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  answers!: string[];
}
