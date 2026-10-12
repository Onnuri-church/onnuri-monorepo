import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// PATCH /posts/:id/comments/:commentId 요청 본문 — 계약은 @onnuri/shared의 UpdatePostCommentRequest.
export class UpdateCommentDto {
  @IsString()
  @IsNotEmpty({ message: '댓글을 입력해주세요.' })
  @MaxLength(1000, { message: '댓글은 1000자까지 쓸 수 있어요.' })
  content!: string;
}
