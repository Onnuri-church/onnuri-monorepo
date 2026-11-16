import { ConfigService } from '@nestjs/config';

import { type AppConfig } from '../../../config/configuration';
import { KakaoTokenVerifier } from './kakao-token.verifier';

// 카카오 프로필의 이메일은 카카오가 유효·인증됐다고 확인한 경우에만 쓴다 (SCRUM-208).
// 이메일로 기존 계정에 연결하므로, 인증 안 된 주소를 믿으면 남의 계정에 들어갈 수 있다.
describe('KakaoTokenVerifier 이메일 신뢰', () => {
  const verifier = new KakaoTokenVerifier({
    get: (key: string) => (key === 'oauth.kakaoAppId' ? '1234' : null),
  } as unknown as ConfigService<AppConfig, true>);

  const mockKakao = (account: Record<string, unknown>) =>
    jest
      .spyOn(global, 'fetch')
      .mockImplementation((url) =>
        Promise.resolve(
          new Response(
            JSON.stringify(
              (url as string).includes('access_token_info')
                ? { app_id: 1234 }
                : { id: 42, kakao_account: account },
            ),
          ),
        ),
      );

  afterEach(() => jest.restoreAllMocks());

  it('유효·인증된 이메일이면 쓴다', async () => {
    mockKakao({
      email: 'me@example.com',
      is_email_valid: true,
      is_email_verified: true,
    });
    await expect(verifier.verify('token')).resolves.toMatchObject({
      providerUid: '42',
      email: 'me@example.com',
    });
  });

  it('인증 안 된 이메일이면 버린다', async () => {
    mockKakao({
      email: 'victim@example.com',
      is_email_valid: true,
      is_email_verified: false,
    });
    await expect(verifier.verify('token')).resolves.toMatchObject({
      email: null,
    });
  });

  it('유효하지 않은(다른 계정에 다시 쓰인) 이메일이면 버린다', async () => {
    mockKakao({
      email: 'old@example.com',
      is_email_valid: false,
      is_email_verified: true,
    });
    await expect(verifier.verify('token')).resolves.toMatchObject({
      email: null,
    });
  });
});
