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
}
