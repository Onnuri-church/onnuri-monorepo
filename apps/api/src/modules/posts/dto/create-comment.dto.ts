import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// POST /posts/:id/comments 요청 본문 — 댓글은 게시판 공용(Comment 테이블)이다.
export class CreateCommentDto {
  @IsString()
  @IsNotEmpty({ message: '댓글 내용을 입력해주세요.' })
  @MaxLength(1000, { message: '댓글은 1000자 이하여야 합니다.' })
  content!: string;
}
