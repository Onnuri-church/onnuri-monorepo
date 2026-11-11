import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { RATE_LIMITS } from '../src/common/decorators/rate-limit.decorator';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { DEV_LOGIN_HEADER } from './dev-login';

const EMAIL_DOMAIN = 'rate-limit-e2e.test';

// 요청 횟수 제한 (SCRUM-165): 로그인한 요청은 사람 단위, 토큰 없는 요청은 IP 단위로 센다.
// 다른 e2e는 setup-e2e에서 꺼 두므로 이 파일만 켰다가 끝나면 되돌린다.
describe('Rate limit (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokenA: string;
  let tokenB: string;

  const devLogin = async (name: string) => {
    const res = await request(app.getHttpServer())
      .post('/auth/login/dev')
      .set(DEV_LOGIN_HEADER)
      .send({ email: `${name}@${EMAIL_DOMAIN}` })
      .expect(201);
    return (res.body as { accessToken: string }).accessToken;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    // 한 서버를 계속 열어 둔다 — supertest는 닫힌 서버면 요청마다 새 포트를 열어서,
    // 수백 번 연달아 보내면 소켓이 끊긴다.
    await app.listen(0);
    prisma = app.get(PrismaService);
    // 로그인은 끈 상태에서 해 둔다 — 켠 뒤의 auth 통 횟수를 깨끗하게 시작하려고.
    tokenA = await devLogin('a');
    tokenB = await devLogin('b');
    process.env.RATE_LIMIT_DISABLED = 'false';
  });

  afterAll(async () => {
    process.env.RATE_LIMIT_DISABLED = 'true';
    await prisma.user.deleteMany({
      where: { email: { endsWith: `@${EMAIL_DOMAIN}` } },
    });
    await app.close();
  });

  it('토큰 없는 요청은 IP 단위로 세고, 기본 한도를 넘기면 429와 Retry-After를 받는다', async () => {
    const server = app.getHttpServer();
    // 한도 안의 요청은 평소처럼 응답한다 (DB를 안 타는 루트 경로로 센다).
    for (let i = 0; i < RATE_LIMITS.default.limit; i++) {
      await request(server).get('/').expect(200);
    }
    const res = await request(server).get('/').expect(429);
    expect(res.headers['retry-after']).toBeDefined();
  });

  it('사람 단위로 세므로, 같은 IP라도 다른 사람의 요청은 막히지 않는다', async () => {
    const server = app.getHttpServer();
    // 위 테스트로 이 IP의 무토큰 통은 다 찼다. 로그인한 요청은 사람 통을 쓰므로 통과해야 한다.
    await request(server)
      .get('/users/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    await request(server)
      .get('/users/me')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
  });

  it('로그인 경로는 IP 단위 auth 한도를 따로 쓴다', async () => {
    const server = app.getHttpServer();
    for (let i = 0; i < RATE_LIMITS.auth.limit; i++) {
      // 틀린 refresh 토큰 — 401이어도 한 번으로 센다 (가드가 없는 경로라 인터셉터까지 온다).
      await request(server)
        .post('/auth/refresh')
        .send({ refreshToken: 'nope' })
        .expect(401);
    }
    await request(server)
      .post('/auth/refresh')
      .send({ refreshToken: 'nope' })
      .expect(429);
  });
});
