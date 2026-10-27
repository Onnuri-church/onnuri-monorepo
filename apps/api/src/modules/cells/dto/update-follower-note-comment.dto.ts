import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// PATCH /cells/:id/follower-notes/:noteId/comments/:commentId 요청 본문 — 내용만 고친다.
export class UpdateFollowerNoteCommentDto {
  @IsString()
  @IsNotEmpty({ message: '댓글 내용을 입력해주세요.' })
  @MaxLength(1000, { message: '댓글은 1000자 이하여야 합니다.' })
  content!: string;
}
