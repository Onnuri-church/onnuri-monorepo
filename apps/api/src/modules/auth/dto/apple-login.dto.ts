import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

// Apple 로그인 (SCRUM-200) — identityToken + 첫 로그인 때만 오는 이름.
export class AppleLoginDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  // 탈퇴 때 토큰 철회용 리프레시 토큰을 받는 일회용 코드 (SCRUM-205). 예전 앱은 안 보낸다.
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  authorizationCode?: string;
}
