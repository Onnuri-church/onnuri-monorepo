import { IsNotEmpty, IsString } from 'class-validator';

// POST /attendance/check-in 요청 본문 — 계약은 @onnuri/shared의 QrCheckInRequest.
export class CheckInDto {
  @IsString()
  @IsNotEmpty()
  code!: string;
}
