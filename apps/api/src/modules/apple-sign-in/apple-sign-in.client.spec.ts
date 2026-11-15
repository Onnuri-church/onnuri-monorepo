import { ConfigService } from '@nestjs/config';
import { generateKeyPairSync, verify } from 'crypto';

import { type AppConfig } from '../../config/configuration';
import { AppleSignInClient } from './apple-sign-in.client';

// Sign in with Apple 서버 API 클라이언트 (SCRUM-205): client_secret JWT 모양·서명과
// 키가 없을 때 조용히 꺼지는지, 토큰·철회 요청 형식을 본다 (fetch는 가짜).
describe('AppleSignInClient', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
  });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

  const build = (configured: boolean) =>
    new AppleSignInClient({
      get: () =>
        configured
          ? { teamId: 'TEAM123456', keyId: 'KEY1234567', privateKey: pem }
          : { teamId: null, keyId: null, privateKey: null },
    } as unknown as ConfigService<AppConfig, true>);

  const decode = (part: string) =>
    JSON.parse(Buffer.from(part, 'base64url').toString()) as Record<
      string,
      unknown
    >;

  afterEach(() => jest.restoreAllMocks());

  it('client_secret은 ES256 JWT이고 .p8 키로 검증된다', () => {
    const secret = build(true).clientSecret('com.onnuri.mobile', 1_000);
    const [header, payload, signature] = secret.split('.');
    expect(decode(header)).toEqual({ alg: 'ES256', kid: 'KEY1234567' });
    expect(decode(payload)).toEqual({
      iss: 'TEAM123456',
      iat: 1_000,
      exp: 1_300,
      aud: 'https://appleid.apple.com',
      sub: 'com.onnuri.mobile',
    });
    expect(
      verify(
        'sha256',
        Buffer.from(`${header}.${payload}`),
        { key: publicKey, dsaEncoding: 'ieee-p1363' },
        Buffer.from(signature, 'base64url'),
      ),
    ).toBe(true);
  });

  it('키가 없으면 꺼져서 애플을 부르지 않는다', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    const client = build(false);
    expect(client.enabled).toBe(false);
    await expect(client.exchangeCode('code', 'app')).resolves.toBeNull();
    await expect(client.revoke('token', 'app')).resolves.toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('코드를 리프레시 토큰으로 바꾸고, 철회 요청을 폼으로 보낸다', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            refresh_token: 'r-token',
            id_token: `h.${Buffer.from(JSON.stringify({ sub: 'apple-uid' })).toString('base64url')}.s`,
          }),
        ),
      )
      .mockResolvedValueOnce(new Response(''));
    const client = build(true);

    await expect(
      client.exchangeCode('c-1', 'com.onnuri.mobile'),
    ).resolves.toEqual({ refreshToken: 'r-token', subject: 'apple-uid' });
    await expect(client.revoke('r-token', 'com.onnuri.mobile')).resolves.toBe(
      true,
    );

    const [tokenUrl, tokenInit] = fetchSpy.mock.calls[0];
    expect(tokenUrl).toBe('https://appleid.apple.com/auth/token');
    const tokenForm = tokenInit?.body as URLSearchParams;
    expect(tokenForm.get('grant_type')).toBe('authorization_code');
    expect(tokenForm.get('code')).toBe('c-1');
    expect(tokenForm.get('client_id')).toBe('com.onnuri.mobile');

    const [revokeUrl, revokeInit] = fetchSpy.mock.calls[1];
    expect(revokeUrl).toBe('https://appleid.apple.com/auth/revoke');
    const revokeForm = revokeInit?.body as URLSearchParams;
    expect(revokeForm.get('token')).toBe('r-token');
    expect(revokeForm.get('token_type_hint')).toBe('refresh_token');
  });

  it('철회 실패는 삼키고 기록만 남긴다 (탈퇴를 막지 않는다)', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response('invalid_client', { status: 400 }));
    const client = build(true);
    const clientLog = jest
      .spyOn(
        (client as unknown as { logger: { error: () => void } }).logger,
        'error',
      )
      .mockImplementation(() => undefined);
    await expect(
      client.revokeQuietly('r-token', 'com.onnuri.mobile'),
    ).resolves.toBeUndefined();
    expect(clientLog).toHaveBeenCalled();
  });
});
