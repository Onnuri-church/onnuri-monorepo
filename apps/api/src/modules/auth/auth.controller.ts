import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { AuthService } from './auth.service';
import { DevLoginDto } from './dto/dev-login.dto';
import { KakaoLoginDto } from './dto/kakao-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SocialLoginDto } from './dto/social-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login/kakao')
  loginWithKakao(@Body() dto: KakaoLoginDto) {
    return this.authService.loginWithKakao(dto);
  }

  @Post('login/google')
  loginWithGoogle(@Body() dto: SocialLoginDto) {
    return this.authService.loginWithGoogle(dto.token);
  }

  // 개발 환경 전용 (AUTH_DEV_LOGIN=true) — 꺼진 환경에서는 404
  @Post('login/dev')
  loginWithDev(@Body() dto: DevLoginDto) {
    return this.authService.loginWithDev(dto.email, dto.role);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }
}
