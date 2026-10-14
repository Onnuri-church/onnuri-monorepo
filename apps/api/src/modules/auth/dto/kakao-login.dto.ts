import { IsNotEmpty, IsString, ValidateIf } from 'class-validator';

// 둘 중 한 방식으로 로그인한다:
// - token: 모바일 SDK가 발급받은 카카오 액세스 토큰
// - code + redirectUri: 인가 코드 — 백엔드가 REST 키(+Client Secret)로 교환한다 (웹 흐름·수동 테스트용)
export class KakaoLoginDto {
  @ValidateIf((dto: KakaoLoginDto) => !dto.code)
  @IsString()
  @IsNotEmpty()
  token?: string;

  @ValidateIf((dto: KakaoLoginDto) => !dto.token)
  @IsString()
  @IsNotEmpty()
  code?: string;

  // 인가 요청에 쓴 redirect_uri와 정확히 같아야 카카오가 교환을 허용한다.
  @ValidateIf((dto: KakaoLoginDto) => Boolean(dto.code))
  @IsString()
  @IsNotEmpty()
  redirectUri?: string;
}
