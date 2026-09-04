import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { type AppConfig } from '../../../config/configuration';
import type { SocialProfile } from './social-profile';

interface KakaoTokenInfo {
  app_id: number;
}

interface KakaoMe {
  id: number;
  kakao_account?: {
    email?: string;
    profile?: { nickname?: string };
  };
}

interface KakaoTokenExchange {
  access_token: string;
}

// 모바일 SDK가 발급받은 카카오 액세스 토큰을 카카오 서버에 검증한다.
// 인가 코드 → 액세스 토큰 교환(웹 흐름·수동 테스트용)도 여기서 처리한다.
@Injectable()
export class KakaoTokenVerifier {
  private readonly logger = new Logger(KakaoTokenVerifier.name);
  private readonly appId: string | null;
  private readonly restApiKey: string | null;
  private readonly clientSecret: string | null;

  constructor(config: ConfigService<AppConfig, true>) {
    this.appId = config.get('oauth.kakaoAppId', { infer: true });
    this.restApiKey = config.get('oauth.kakaoRestApiKey', { infer: true });
    this.clientSecret = config.get('oauth.kakaoClientSecret', { infer: true });
    if (!this.appId) {
      this.logger.warn(
        'KAKAO_APP_ID가 비어 있어 카카오 토큰의 발급 앱 검증을 건너뜁니다 — 운영에서는 반드시 설정할 것.',
      );
    }
  }

  // 인가 코드를 액세스 토큰으로 교환한다. redirectUri는 인가 요청에 쓴 값과 정확히 같아야 한다.
  async exchangeCode(code: string, redirectUri: string): Promise<string> {
    if (!this.restApiKey) {
      throw new ServiceUnavailableException(
        'KAKAO_REST_API_KEY가 설정되지 않아 인가 코드 로그인을 쓸 수 없습니다.',
      );
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.restApiKey,
      redirect_uri: redirectUri,
      code,
    });
    if (this.clientSecret) body.set('client_secret', this.clientSecret);

    let response: Response;
    try {
      response = await fetch('https://kauth.kakao.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
        body,
      });
    } catch {
      throw new ServiceUnavailableException(
        '카카오 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      );
    }
    if (!response.ok) {
      // KOE 코드가 있으면 원인 파악에 쓸 수 있게 메시지에 실어준다 (예: KOE320 = 무효한 코드).
      const err = (await response.json().catch(() => null)) as {
        error_code?: string;
      } | null;
      throw new UnauthorizedException(
        `카카오 인가 코드 교환에 실패했습니다.${err?.error_code ? ` (${err.error_code})` : ''}`,
      );
    }
    const data = (await response.json()) as KakaoTokenExchange;
    return data.access_token;
  }

  async verify(accessToken: string): Promise<SocialProfile> {
    const headers = { Authorization: `Bearer ${accessToken}` };

    // 다른 카카오 앱에서 발급된 토큰으로 로그인하는 것을 막는다.
    if (this.appId) {
      const info = await this.fetchKakao<KakaoTokenInfo>(
        'https://kapi.kakao.com/v1/user/access_token_info',
        headers,
      );
      if (String(info.app_id) !== this.appId) {
        throw new UnauthorizedException(
          '다른 앱에서 발급된 카카오 토큰입니다.',
        );
      }
    }

    const me = await this.fetchKakao<KakaoMe>(
      'https://kapi.kakao.com/v2/user/me',
      headers,
    );
    return {
      providerUid: String(me.id),
      email: me.kakao_account?.email ?? null,
      name: me.kakao_account?.profile?.nickname ?? null,
    };
  }

  private async fetchKakao<T>(
    url: string,
    headers: Record<string, string>,
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(url, { headers });
    } catch {
      throw new ServiceUnavailableException(
        '카카오 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      );
    }
    if (!response.ok) {
      throw new UnauthorizedException('카카오 토큰 검증에 실패했습니다.');
    }
    return (await response.json()) as T;
  }
}
