import { IsString, MaxLength } from 'class-validator';

export class RegisterPushTokenDto {
  // Expo 푸시 토큰 ("ExponentPushToken[...]"). 형식 검증은 발송 시 Expo가 하므로 길이만 조인다.
  @IsString()
  @MaxLength(200)
  token: string;
}
