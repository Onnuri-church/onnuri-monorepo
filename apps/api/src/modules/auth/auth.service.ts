import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'node:crypto';

import { SocialProvider } from '../../../generated/prisma';
import { type AppConfig } from '../../config/configuration';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { KakaoLoginDto } from './dto/kakao-login.dto';
import { GoogleTokenVerifier } from './social/google-token.verifier';
import { KakaoTokenVerifier } from './social/kakao-token.verifier';
import type { SocialProfile } from './social/social-profile';
import type { JwtPayload } from './strategies/jwt.strategy';

interface RefreshPayload {
  sub: string;
  jti: string;
}

// 임시방편: 카카오 이메일 동의항목이 심사 전이라 이메일이 안 온다. 유저를 만들려면
// email(NOT NULL 유니크)이 필요하므로, 실존할 수 없는 예약 도메인(.invalid)으로 임시
// 이메일을 만들어 가입시키고, 나중에 실제 이메일이 오면 재로그인 시점에 교체한다
// (findOrCreateUser 참고). 심사 통과 후 이 임시방편 제거를 검토한다 — ARCHITECTURE.md Known Issues.
const PLACEHOLDER_EMAIL_DOMAIN = 'social.invalid';

function placeholderEmail(provider: SocialProvider, providerUid: string) {
  return `${provider.toLowerCase()}-${providerUid}@${PLACEHOLDER_EMAIL_DOMAIN}`;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly kakaoVerifier: KakaoTokenVerifier,
    private readonly googleVerifier: GoogleTokenVerifier,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async loginWithKakao(input: KakaoLoginDto) {
    let accessToken: string;
    if (input.token) {
      accessToken = input.token;
    } else if (input.code && input.redirectUri) {
      accessToken = await this.kakaoVerifier.exchangeCode(
        input.code,
        input.redirectUri,
      );
    } else {
      // DTO 검증이 걸러주지만, 타입 좁히기를 위해 명시적으로 처리한다.
      throw new BadRequestException(
        'token 또는 code+redirectUri가 필요합니다.',
      );
    }

    const profile = await this.kakaoVerifier.verify(accessToken);
    return this.login(SocialProvider.KAKAO, profile);
  }

  async loginWithGoogle(idToken: string) {
    const profile = await this.googleVerifier.verify(idToken);
    return this.login(SocialProvider.GOOGLE, profile);
  }

  // 리프레시 토큰 회전: 저장된 해시와 일치하는 행을 지우면서 소비한다.
  // 이미 회전된 토큰의 재사용은 삭제 건수 0으로 걸러진다.
  async refresh(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);
    const consumed = await this.prisma.refreshToken.deleteMany({
      where: { id: payload.jti, tokenHash: this.hash(refreshToken) },
    });
    if (consumed.count === 0) {
      throw new UnauthorizedException(
        '이미 사용됐거나 무효화된 리프레시 토큰입니다.',
      );
    }
    return this.issueTokenPair(payload.sub);
  }

  async logout(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);
    await this.prisma.refreshToken.deleteMany({
      where: { id: payload.jti, tokenHash: this.hash(refreshToken) },
    });
  }

  private async login(provider: SocialProvider, profile: SocialProfile) {
    const { user, isNewUser } = await this.findOrCreateUser(provider, profile);
    const tokens = await this.issueTokenPair(user.id);
    return {
      ...tokens,
      isNewUser,
      user: await this.usersService.findById(user.id),
    };
  }

  private async findOrCreateUser(
    provider: SocialProvider,
    profile: SocialProfile,
  ) {
    const account = await this.prisma.socialAccount.findUnique({
      where: {
        provider_providerUid: { provider, providerUid: profile.providerUid },
      },
      select: { user: true },
    });
    if (account) {
      // 임시 이메일로 가입했던 계정에 실제 이메일이 생겼으면(동의항목 심사 통과 후) 교체한다.
      const user = await this.replacePlaceholderEmail(
        account.user,
        profile.email,
      );
      return { user, isNewUser: false };
    }

    // email은 카카오·구글 계정을 같은 사람으로 연결하는 축인데, 카카오가 심사 전이라
    // 이메일을 안 줄 수 있다 — 그 경우 임시 이메일로 가입시킨다 (파일 상단 주석 참고).
    const email =
      profile.email ?? placeholderEmail(provider, profile.providerUid);

    // 같은 이메일의 기존 유저가 있으면 새 로그인 수단으로 연결한다 (카카오·구글 병용).
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      await this.prisma.socialAccount.create({
        data: {
          userId: existing.id,
          provider,
          providerUid: profile.providerUid,
        },
      });
      return { user: existing, isNewUser: false };
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        // 프로필 미제공 시 임시 이름 — 프로필 설정 화면에서 다시 입력받는다.
        name: profile.name ?? email.split('@')[0],
        socialAccounts: {
          create: { provider, providerUid: profile.providerUid },
        },
      },
    });
    return { user, isNewUser: true };
  }

  private async replacePlaceholderEmail(
    user: { id: string; email: string },
    email: string | null,
  ) {
    if (!email || !user.email.endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`)) {
      return user;
    }
    try {
      return await this.prisma.user.update({
        where: { id: user.id },
        data: { email },
      });
    } catch {
      // 그 이메일을 이미 쓰는 다른 계정이 있으면(유니크 충돌) 임시 이메일을 유지한다 —
      // 계정 병합이 필요한 케이스라 로그인 자체는 막지 않는다.
      return user;
    }
  }

  private async issueTokenPair(userId: string) {
    const payload: JwtPayload = { sub: userId };
    const accessToken = this.jwtService.sign(payload);

    const jti = randomUUID();
    const refreshToken = this.jwtService.sign(
      { sub: userId, jti },
      {
        secret: this.config.get('jwt.refreshSecret', { infer: true }),
        expiresIn: this.config.get('jwt.refreshExpiresIn', { infer: true }),
      },
    );
    const { exp } = this.jwtService.decode<{ exp: number }>(refreshToken);
    await this.prisma.refreshToken.create({
      data: {
        id: jti,
        userId,
        tokenHash: this.hash(refreshToken),
        expiresAt: new Date(exp * 1000),
      },
    });
    return { accessToken, refreshToken };
  }

  private async verifyRefreshToken(
    refreshToken: string,
  ): Promise<RefreshPayload> {
    try {
      return await this.jwtService.verifyAsync<RefreshPayload>(refreshToken, {
        secret: this.config.get('jwt.refreshSecret', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
    }
  }

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
