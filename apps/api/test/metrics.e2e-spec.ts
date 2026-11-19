import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { AdminMetricsResponse } from '@onnuri/shared';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { MetricsRecorderService } from '../src/modules/metrics/metrics-recorder.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { DEV_LOGIN_HEADER } from './dev-login';

const EMAIL_DOMAIN = 'metrics-e2e.test';
const ROUTE = '/users/me';

// 운영 지표 (SCRUM-249·250): 로그인한 요청이 '오늘 쓴 사람'과 요청 집계로 쌓이고, 관리자만 조회한다.
// 다른 e2e는 setup-e2e에서 기록을 꺼 두므로 이 파일만 켰다가 끝나면 되돌린다.
describe('Metrics (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let recorder: MetricsRecorderService;
  let adminToken: string;
  let plainToken: string;
  let plainId: string;
  let startedAt: Date;

  const devLogin = async (name: string, role?: 'ADMIN') => {
    const res = await request(app.getHttpServer())
      .post('/auth/login/dev')
      .set(DEV_LOGIN_HEADER)
      .send({ email: `${name}@${EMAIL_DOMAIN}`, ...(role ? { role } : {}) })
      .expect(201);
    const body = res.body as { accessToken: string; user: { id: string } };
    return { token: body.accessToken, userId: body.user.id };
  };
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    recorder = app.get(MetricsRecorderService);
    adminToken = (await devLogin('admin', 'ADMIN')).token;
    const plain = await devLogin('plain');
    plainToken = plain.token;
    plainId = plain.userId;
    startedAt = new Date();
    startedAt.setUTCMinutes(0, 0, 0);
    process.env.METRICS_DISABLED = 'false';
  });

  afterAll(async () => {
    process.env.METRICS_DISABLED = 'true';
    // 이 테스트가 쌓은 줄만 지운다 — 사람 줄은 유저 삭제에 딸려 지워진다.
    await recorder.flush();
    await prisma.user.deleteMany({
      where: { email: { endsWith: `@${EMAIL_DOMAIN}` } },
    });
    await app.close();
  });

  it('관리자만 조회한다', async () => {
    await request(app.getHttpServer()).get('/admin/metrics').expect(401);
    await request(app.getHttpServer())
      .get('/admin/metrics')
      .set(auth(plainToken))
      .expect(403);
  });

  it('로그인한 요청이 오늘 쓴 사람과 요청 집계로 쌓인다', async () => {
    const before = await prisma.apiRequestStat.findFirst({
      where: { hour: { gte: startedAt }, method: 'GET', route: ROUTE },
      select: { count: true },
    });
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer())
        .get(ROUTE)
        .set(auth(plainToken))
        .expect(200);
    }
    await recorder.flush();

    // 같은 사람은 하루에 한 줄만
    const activity = await prisma.userActivityDay.findMany({
      where: { userId: plainId },
    });
    expect(activity).toHaveLength(1);
    const after = await prisma.apiRequestStat.findMany({
      where: { hour: { gte: startedAt }, method: 'GET', route: ROUTE },
      select: { count: true, totalMs: true, maxMs: true },
    });
    const total = after.reduce((sum, row) => sum + row.count, 0);
    expect(total - (before?.count ?? 0)).toBeGreaterThanOrEqual(3);

    const res = await request(app.getHttpServer())
      .get('/admin/metrics?days=7')
      .set(auth(adminToken))
      .expect(200);
    const body = res.body as AdminMetricsResponse;
    expect(body.days).toBe(7);
    expect(body.users.signups).toHaveLength(7);
    expect(body.activity.daily).toHaveLength(7);
    expect(body.activity.daily.at(-1)?.count).toBeGreaterThanOrEqual(1);
    expect(body.activity.wau).toBeGreaterThanOrEqual(1);
    expect(body.activity.trackingSince).not.toBeNull();
    expect(body.content.daily).toHaveLength(7);
    expect(body.requests.total).toBeGreaterThanOrEqual(3);
    expect(
      body.requests.topRoutes.some(
        (row) => row.method === 'GET' && row.route === ROUTE,
      ),
    ).toBe(true);
  });

  it('days는 1~90으로 맞추고, 숫자가 아니면 기본 30일', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/metrics?days=999')
      .set(auth(adminToken))
      .expect(200);
    expect((res.body as AdminMetricsResponse).days).toBe(90);
    const fallback = await request(app.getHttpServer())
      .get('/admin/metrics?days=abc')
      .set(auth(adminToken))
      .expect(200);
    expect((fallback.body as AdminMetricsResponse).days).toBe(30);
  });
});
