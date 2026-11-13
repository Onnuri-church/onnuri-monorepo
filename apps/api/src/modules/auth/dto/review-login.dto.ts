import { IsString, MaxLength } from 'class-validator';

// 스토어 심사용 로그인 (SCRUM-197) — 앱 로그인 화면의 숨은 입력창에서 보낸다.
export class ReviewLoginDto {
  @IsString()
  @MaxLength(100)
  id: string;

  @IsString()
  @MaxLength(200)
  password: string;
}
