import { IsIn } from 'class-validator';

// PATCH /group-meetings/:id/members/:userId — 신청(PENDING) 승인/거절.
export class DecideMemberDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';
}
