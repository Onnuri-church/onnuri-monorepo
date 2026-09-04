import { IsNotEmpty, IsString } from 'class-validator';

export class SocialLoginDto {
  // 카카오: SDK가 발급한 액세스 토큰, 구글: ID 토큰
  @IsString()
  @IsNotEmpty()
  token: string;
}
