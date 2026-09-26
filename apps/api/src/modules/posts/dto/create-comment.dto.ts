import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

// POST /posts/:id/comments 요청 본문 — 댓글은 게시판 공용(Comment 테이블)이다.
export class CreateCommentDto {
  @IsString()
  @IsNotEmpty({ message: '댓글 내용을 입력해주세요.' })
  @MaxLength(1000, { message: '댓글은 1000자 이하여야 합니다.' })
  content!: string;

  // 주면 그 댓글의 대댓글이 된다. 깊이는 1단계까지라 대댓글의 id를 주면 400이다.
  @IsOptional()
  @IsString()
  parentId?: string;
}
