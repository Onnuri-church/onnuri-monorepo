import { IsIn, IsOptional } from 'class-validator';

// PUT /users/:id/suspension 요청 본문 (관리자 전용, SCRUM-204).
// days를 빼거나 null이면 "해제할 때까지" 정지한다.
export class SuspendUserDto {
  @IsOptional()
  @IsIn([7, 30], {
    message: '정지 기간은 7일·30일·해제할 때까지 중에서 고를 수 있어요.',
  })
  days?: 7 | 30 | null;
}
