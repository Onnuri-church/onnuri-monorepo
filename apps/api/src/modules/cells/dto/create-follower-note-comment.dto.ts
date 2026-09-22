import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

// POST /cells/:id/follower-notes/:noteId/comments 요청 본문.
export class CreateFollowerNoteCommentDto {
  @IsString()
  @IsNotEmpty({ message: '댓글 내용을 입력해주세요.' })
  @MaxLength(1000, { message: '댓글은 1000자 이하여야 합니다.' })
  content!: string;

  /** 대댓글 부모 — 1단계 깊이만 허용 (서비스에서 검증) */
  @IsOptional()
  @IsString()
  parentId?: string;
}
