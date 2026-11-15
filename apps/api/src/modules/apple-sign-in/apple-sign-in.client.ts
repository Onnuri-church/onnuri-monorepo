import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPrivateKey, sign, type KeyObject } from 'crypto';

import { type AppConfig } from '../../config/configuration';

const APPLE_AUDIENCE = 'https://appleid.apple.com';
const TOKEN_URL = 'https://appleid.apple.com/auth/token';
const REVOKE_URL = 'https://appleid.apple.com/auth/revoke';
// client_secret은 짧게 만든다 — 매 요청 새로 서명하니 길 필요가 없다 (애플 최대 6개월).
const CLIENT_SECRET_TTL_SEC = 5 * 60;

// Sign in with Apple 서버 API (SCRUM-205). 애플은 Apple 로그인을 쓰는 앱이 회원탈퇴 때 토큰을
// 철회하도록 요구한다 (App Store 가이드라인 5.1.1(v)). 철회에는 리프레시 토큰이 필요해서,
// 로그인 때 앱이 받은 authorization code를 리프레시 토큰으로 바꿔 두었다가 탈퇴 때 철회한다.
// 키(APPLE_TEAM_ID·APPLE_KEY_ID·APPLE_PRIVATE_KEY)가 없으면 둘 다 조용히 건너뛴다 — 로그인과
// 탈퇴 자체는 막지 않는다 (키는 Apple 개발자 계정 주인이 Keys 메뉴에서 만든다).
@Injectable()
export class AppleSignInClient {
  private readonly logger = new Logger(AppleSignInClient.name);
  private readonly teamId: string | null;
  private readonly keyId: string | null;
  private readonly privateKey: KeyObject | null;

  constructor(config: ConfigService<AppConfig, true>) {
    const apple = config.get('appleSignIn', { infer: true });
    this.teamId = apple.teamId;
    this.keyId = apple.keyId;
    this.privateKey = apple.privateKey
      ? createPrivateKey(apple.privateKey)
      : null;
  }

  get enabled(): boolean {
    return !!(this.teamId && this.keyId && this.privateKey);
  }

  /** authorization code → 리프레시 토큰. 키가 없으면 null. */
  async exchangeCode(code: string, clientId: string): Promise<string | null> {
    if (!this.enabled) return null;
    const body = await this.post(TOKEN_URL, {
      client_id: clientId,
      client_secret: this.clientSecret(clientId),
      code,
      grant_type: 'authorization_code',
    });
    const { refresh_token: refreshToken } = JSON.parse(body) as {
      refresh_token?: string;
    };
    return refreshToken ?? null;
  }

  /** 리프레시 토큰 철회. 키가 없으면 false. 이미 철회된 토큰도 애플은 200을 준다. */
  async revoke(refreshToken: string, clientId: string): Promise<boolean> {
    if (!this.enabled) return false;
    await this.post(REVOKE_URL, {
      client_id: clientId,
      client_secret: this.clientSecret(clientId),
      token: refreshToken,
      token_type_hint: 'refresh_token',
    });
    return true;
  }

  /** 탈퇴 처리용 — 실패해도 throw하지 않고 기록만 남긴다 (탈퇴는 이미 끝났다). */
  async revokeQuietly(refreshToken: string, clientId: string): Promise<void> {
    try {
      await this.revoke(refreshToken, clientId);
    } catch (error) {
      this.logger.error(`Apple 토큰 철회 실패: ${String(error)}`);
    }
  }

  // ES256으로 서명한 JWT (애플 문서 "Creating a client secret"). 라이브러리를 늘리지 않게 직접 만든다.
  clientSecret(clientId: string, now = Math.floor(Date.now() / 1000)): string {
    if (!this.enabled)
      throw new Error('Apple 로그인 키가 설정되지 않았습니다.');
    const encode = (value: object) =>
      Buffer.from(JSON.stringify(value)).toString('base64url');
    const header = encode({ alg: 'ES256', kid: this.keyId });
    const payload = encode({
      iss: this.teamId,
      iat: now,
      exp: now + CLIENT_SECRET_TTL_SEC,
      aud: APPLE_AUDIENCE,
      sub: clientId,
    });
    const signature = sign('sha256', Buffer.from(`${header}.${payload}`), {
      key: this.privateKey!,
      dsaEncoding: 'ieee-p1363',
    }).toString('base64url');
    return `${header}.${payload}.${signature}`;
  }

  private async post(url: string, form: Record<string, string>) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(form),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`${url} ${response.status} ${text.slice(0, 200)}`);
    }
    return text;
  }
}
