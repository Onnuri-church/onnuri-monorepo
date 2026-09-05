import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

import { type AppConfig } from '../../../config/configuration';
import type { SocialProfile } from './social-profile';

// 모바일 SDK가 발급받은 구글 ID 토큰을 서명·만료·aud 기준으로 검증한다 (구글 공개키는 라이브러리가 캐싱).
@Injectable()
export class GoogleTokenVerifier {
  private readonly logger = new Logger(GoogleTokenVerifier.name);
  private readonly client = new OAuth2Client();
  private readonly clientIds: string[];

  constructor(config: ConfigService<AppConfig, true>) {
    this.clientIds = config.get('oauth.googleClientIds', { infer: true });
    if (this.clientIds.length === 0) {
      this.logger.warn(
        'GOOGLE_CLIENT_IDS가 비어 있어 구글 ID 토큰의 aud 검증을 건너뜁니다 — 운영에서는 반드시 설정할 것.',
      );
    }
  }

  async verify(idToken: string): Promise<SocialProfile> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.clientIds.length > 0 ? this.clientIds : undefined,
      });
      const payload = ticket.getPayload();
      if (!payload) throw new Error('payload가 비어 있습니다.');
      return {
        providerUid: payload.sub,
        email: payload.email ?? null,
        name: payload.name ?? null,
      };
    } catch {
      throw new UnauthorizedException('구글 토큰 검증에 실패했습니다.');
    }
  }
}
