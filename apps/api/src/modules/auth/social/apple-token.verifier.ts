import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

import { type AppConfig } from '../../../config/configuration';
import type { SocialProfile } from './social-profile';

const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';
const APPLE_ISSUER = 'https://appleid.apple.com';
// 애플 공개키는 자주 바뀌지 않는다 — 한 시간 캐시하고, 모르는 kid가 오면 바로 다시 받는다.
const KEYS_TTL_MS = 60 * 60 * 1000;

interface AppleJwk {
  kid: string;
  kty: string;
  alg: string;
  use: string;
  n: string;
  e: string;
}

// 앱(expo-apple-authentication)이 받은 Apple ID 토큰을 애플 공개키로 검증한다 (SCRUM-200).
// 서명 검증은 이미 쓰는 google-auth-library의 범용 JWT 검증(JWK 지원)을 그대로 쓴다 — 라이브러리를 늘리지 않게.
// 이름은 토큰에 없고 첫 로그인 때만 앱이 받아 따로 보낸다 (애플 정책).
@Injectable()
export class AppleTokenVerifier {
  private readonly client = new OAuth2Client();
  private readonly bundleIds: string[];
  private keys: Record<string, AppleJwk> = {};
  private keysFetchedAt = 0;

  constructor(config: ConfigService<AppConfig, true>) {
    this.bundleIds = config.get('oauth.appleBundleIds', { infer: true });
  }

  async verify(idToken: string, name?: string): Promise<SocialProfile> {
    try {
      const kid = this.readKid(idToken);
      const keys = await this.getKeys(!this.keys[kid]);
      const ticket = await this.client.verifySignedJwtWithCertsAsync(
        idToken,
        keys,
        this.bundleIds,
        [APPLE_ISSUER],
      );
      const payload = ticket.getPayload();
      if (!payload?.sub) throw new Error('sub가 없습니다.');
      return {
        providerUid: payload.sub,
        // "이메일 가리기"를 고르면 앱 전용 중계 주소(…@privaterelay.appleid.com)가 온다 — 그대로 쓴다.
        email: payload.email ?? null,
        name: name?.trim() || null,
        avatarUrl: null,
      };
    } catch {
      throw new UnauthorizedException('Apple 토큰 검증에 실패했습니다.');
    }
  }

  private readKid(idToken: string): string {
    const header = JSON.parse(
      Buffer.from(idToken.split('.')[0] ?? '', 'base64url').toString(),
    ) as { kid?: string };
    if (!header.kid) throw new Error('kid가 없습니다.');
    return header.kid;
  }

  private async getKeys(force: boolean) {
    if (!force && Date.now() - this.keysFetchedAt < KEYS_TTL_MS) {
      return this.keys;
    }
    const response = await fetch(APPLE_KEYS_URL);
    if (!response.ok) throw new Error(`apple keys ${response.status}`);
    const { keys } = (await response.json()) as { keys: AppleJwk[] };
    this.keys = Object.fromEntries(keys.map((key) => [key.kid, key]));
    this.keysFetchedAt = Date.now();
    return this.keys;
  }
}
