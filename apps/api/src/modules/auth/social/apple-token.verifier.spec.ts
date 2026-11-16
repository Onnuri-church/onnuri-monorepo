import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateKeyPairSync, sign } from 'crypto';

import { type AppConfig } from '../../../config/configuration';
import { AppleTokenVerifier } from './apple-token.verifier';

// 애플 ID 토큰 검증 — 애플 공개키(JWK)로 서명된 토큰을 실제로 통과시키는지 본다.
// e2e는 거절 경로만 봐서, JWK를 Node crypto에 그대로 넘기던 버그(항상 401)를 못 잡았다.
describe('AppleTokenVerifier', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  const jwk = {
    ...publicKey.export({ format: 'jwk' }),
    kid: 'TESTKID',
    alg: 'RS256',
    use: 'sig',
  };

  const verifier = new AppleTokenVerifier({
    get: () => ['com.onnuri.mobile', 'com.onnuri.mobile.dev'],
  } as unknown as ConfigService<AppConfig, true>);

  const token = (payload: Record<string, unknown>) => {
    const encode = (value: object) =>
      Buffer.from(JSON.stringify(value)).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const head = encode({ alg: 'RS256', kid: 'TESTKID' });
    const body = encode({
      iss: 'https://appleid.apple.com',
      aud: 'com.onnuri.mobile',
      sub: 'apple-user-1',
      email: 'relay@privaterelay.appleid.com',
      email_verified: 'true',
      iat: now,
      exp: now + 600,
      ...payload,
    });
    const signature = sign(
      'sha256',
      Buffer.from(`${head}.${body}`),
      privateKey,
    ).toString('base64url');
    return `${head}.${body}.${signature}`;
  };

  beforeEach(() => {
    jest
      .spyOn(global, 'fetch')
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ keys: [jwk] }))),
      );
    jest
      .spyOn(
        (verifier as unknown as { logger: { warn: () => void } }).logger,
        'warn',
      )
      .mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('애플 키로 서명된 토큰이면 프로필과 clientId(aud)를 준다', async () => {
    await expect(verifier.verify(token({}), ' 홍길동 ')).resolves.toEqual({
      providerUid: 'apple-user-1',
      email: 'relay@privaterelay.appleid.com',
      name: '홍길동',
      avatarUrl: null,
      clientId: 'com.onnuri.mobile',
    });
  });

  it('개발용 앱 번들 ID도 받는다', async () => {
    await expect(
      verifier.verify(token({ aud: 'com.onnuri.mobile.dev' })),
    ).resolves.toMatchObject({ clientId: 'com.onnuri.mobile.dev' });
  });

  it('다른 앱(aud)의 토큰은 401', async () => {
    await expect(
      verifier.verify(token({ aud: 'com.other.app' })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('발급자가 애플이 아니면 401', async () => {
    await expect(
      verifier.verify(token({ iss: 'https://evil.example.com' })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('인증 안 된 이메일은 버린다 (계정 연결에 쓰지 않음)', async () => {
    await expect(
      verifier.verify(token({ email_verified: false })),
    ).resolves.toMatchObject({ email: null });
  });
});
