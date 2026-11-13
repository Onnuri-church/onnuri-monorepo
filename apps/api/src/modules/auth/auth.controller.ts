import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';

import {
  RATE_LIMITS,
  RateLimit,
} from '../../common/decorators/rate-limit.decorator';
import { AuthService } from './auth.service';
import { AppleLoginDto } from './dto/apple-login.dto';
import { DevLoginDto } from './dto/dev-login.dto';
import { KakaoLoginDto } from './dto/kakao-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ReviewLoginDto } from './dto/review-login.dto';
import { SocialLoginDto } from './dto/social-login.dto';

// 로그인·토큰 갱신은 토큰 없이 들어와 IP 단위로 센다 (SCRUM-165).
@RateLimit(RATE_LIMITS.auth)
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

  // iOS — App Store 4.8: 다른 소셜 로그인이 있으면 Apple 로그인도 필수 (SCRUM-200)
  @Post('login/apple')
  loginWithApple(@Body() dto: AppleLoginDto) {
    return this.authService.loginWithApple(dto.token, dto.name);
  }

  // 개발 환경 전용 (AUTH_DEV_LOGIN=true) — 꺼진 환경에서는 404, 비밀 헤더가 틀리면 401
  @Post('login/dev')
  loginWithDev(
    @Body() dto: DevLoginDto,
    @Headers('x-dev-login-secret') secret: string | undefined,
  ) {
    return this.authService.loginWithDev(dto.email, dto.role, secret);
  }

  // 스토어 심사용 (SCRUM-197) — REVIEW_LOGIN_ID/PASSWORD가 없는 환경에서는 404
  @Post('login/review')
  loginForReview(@Body() dto: ReviewLoginDto) {
    return this.authService.loginForReview(dto.id, dto.password);
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
