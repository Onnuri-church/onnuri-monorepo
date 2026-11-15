import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { AppleSignInClient } from '../src/modules/apple-sign-in/apple-sign-in.client';
import { AppleTokenVerifier } from '../src/modules/auth/social/apple-token.verifier';
import { PrismaService } from '../src/modules/prisma/prisma.service';

// 회원탈퇴 시 Apple 로그인 토큰 철회 (SCRUM-205).
// 애플 서버 대신 가짜 검증기·클라이언트를 끼워 (1) 로그인 때 authorization code를 리프레시 토큰으로
// 바꿔 저장하는지 (2) 탈퇴 때 그 토큰을 같은 client_id로 철회하는지 (3) 철회가 실패해도 탈퇴는 되는지 본다.
const EMAIL_DOMAIN = 'apple-revoke-e2e.test';
const CLIENT_ID = 'com.onnuri.mobile';

interface LoginBody {
  accessToken: string;
  user: { id: string };
}

const profiles: Record<string, { providerUid: string; name: string }> = {
  'apple-a': { providerUid: 'apple-revoke-uid-a', name: '애플일' },
  'apple-b': { providerUid: 'apple-revoke-uid-b', name: '애플이' },
  'apple-c': { providerUid: 'apple-revoke-uid-c', name: '애플삼' },
  'apple-d': { providerUid: 'apple-revoke-uid-d', name: '애플사' },
};

describe('Apple token revoke (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const userIds: string[] = [];

  const appleClient = {
    // 코드 'code-<글자>'의 주인은 apple-revoke-uid-<글자>
    exchangeCode: jest.fn((code: string) =>
      Promise.resolve({
        refreshToken: `refresh-for-${code}`,
        subject: `apple-revoke-uid-${code.split('-')[1]}`,
      }),
    ),
    revokeQuietly: jest.fn(() => Promise.resolve()),
  };

  const appleVerifier = {
    verify: (token: string) => {
      const profile = profiles[token];
      if (!profile) return Promise.reject(new Error('unknown token'));
      return Promise.resolve({
        providerUid: profile.providerUid,
        email: `${profile.providerUid}@${EMAIL_DOMAIN}`,
        name: profile.name,
        avatarUrl: null,
        clientId: CLIENT_ID,
      });
    },
  };

  const cleanup = () =>
    prisma.user.deleteMany({
      where: {
        OR: [
          { email: { endsWith: `@${EMAIL_DOMAIN}` } },
          { id: { in: userIds } },
        ],
      },
    });

  const login = async (token: string, authorizationCode?: string) => {
    const res = await request(app.getHttpServer())
      .post('/auth/login/apple')
      .send({ token, authorizationCode })
      .expect(201);
    const body = res.body as LoginBody;
    userIds.push(body.user.id);
    return body;
  };

  const withdraw = (accessToken: string) =>
    request(app.getHttpServer())
      .delete('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AppleTokenVerifier)
      .useValue(appleVerifier)
      .overrideProvider(AppleSignInClient)
      .useValue(appleClient)
      .compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  it('authorizationCode를 보내면 리프레시 토큰과 client_id를 저장하고, 탈퇴 때 철회한다', async () => {
    const { accessToken, user } = await login('apple-a', 'code-a');
    expect(appleClient.exchangeCode).toHaveBeenCalledWith('code-a', CLIENT_ID);
    const account = await prisma.socialAccount.findFirst({
      where: { userId: user.id },
    });
    expect(account?.appleRefreshToken).toBe('refresh-for-code-a');
    expect(account?.appleClientId).toBe(CLIENT_ID);

    await withdraw(accessToken);
    expect(appleClient.revokeQuietly).toHaveBeenCalledWith(
      'refresh-for-code-a',
      CLIENT_ID,
    );
    // 탈퇴하면 연결(과 토큰)은 지워진다.
    expect(
      await prisma.socialAccount.count({ where: { userId: user.id } }),
    ).toBe(0);
  });

  it('authorizationCode 없이 로그인하면(예전 앱) 저장도 철회도 없이 탈퇴된다', async () => {
    const { accessToken, user } = await login('apple-b');
    expect(appleClient.exchangeCode).not.toHaveBeenCalled();
    await withdraw(accessToken);
    expect(appleClient.revokeQuietly).not.toHaveBeenCalled();
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(dbUser?.withdrawnAt).not.toBeNull();
  });

  it('코드 교환이 실패해도 로그인은 된다', async () => {
    appleClient.exchangeCode.mockRejectedValueOnce(new Error('apple down'));
    const { user } = await login('apple-c', 'code-c');
    const account = await prisma.socialAccount.findFirst({
      where: { userId: user.id },
    });
    expect(account?.appleRefreshToken).toBeNull();
  });

  it('남의 authorization code면 토큰을 저장하지 않는다', async () => {
    // apple-d로 로그인하면서 apple-a의 코드를 끼워 넣은 상황
    const { user } = await login('apple-d', 'code-a');
    const account = await prisma.socialAccount.findFirst({
      where: { userId: user.id },
    });
    expect(account?.appleRefreshToken).toBeNull();
  });
});
