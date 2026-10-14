import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { type TypedConfigService } from '../../config/configuration';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleTokenVerifier } from './social/google-token.verifier';
import { KakaoTokenVerifier } from './social/kakao-token.verifier';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    // 기본 서명 옵션은 액세스 토큰 기준 — 리프레시 토큰은 AuthService가 서명 옵션을 직접 지정한다.
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: TypedConfigService) => ({
        secret: config.get('jwt.accessSecret', { infer: true }),
        signOptions: {
          expiresIn: config.get('jwt.accessExpiresIn', { infer: true }),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    KakaoTokenVerifier,
    GoogleTokenVerifier,
  ],
})
export class AuthModule {}
