import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

// 테스트 데이터 식별용 접두사/도메인 — 공용 개발 DB를 쓰므로 시드/실데이터와 안 겹치게 붙인다.
const EMAIL_DOMAIN = 'cell-access-e2e.test';
const FIXTURE_PREFIX = 'cell-access-e2e-';

// 셀 페이지(상세·사진첩·소식) 열람은 그 셀 셀원과 관리자만 된다 (2026-10-18 확정).
describe('Cell access (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let cellId: string;
  let newsId: string;
  let adminToken: string;
  let memberToken: string;
  let outsiderToken: string;

  const cleanup = async () => {
    await prisma.post.deleteMany({
      where: { title: { startsWith: FIXTURE_PREFIX } },
    });
    await prisma.cell.deleteMany({
      where: { name: { startsWith: FIXTURE_PREFIX } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: `@${EMAIL_DOMAIN}` } },
    });
  };

  const devLogin = async (name: string, role?: 'ADMIN') => {
    const res = await request(app.getHttpServer())
      .post('/auth/login/dev')
      .send({ email: `${name}@${EMAIL_DOMAIN}`, ...(role ? { role } : {}) })
      .expect(201);
    const body = res.body as { accessToken: string; user: { id: string } };
    return { token: body.accessToken, userId: body.user.id };
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

    prisma = app.get(PrismaService);
    await cleanup();

    const admin = await devLogin('admin', 'ADMIN');
    const member = await devLogin('member');
    const outsider = await devLogin('outsider');
    adminToken = admin.token;
    memberToken = member.token;
    outsiderToken = outsider.token;

    const cell = await prisma.cell.create({
      data: {
        name: `${FIXTURE_PREFIX}셀`,
        startedAt: new Date('2026-01-01'),
        expiresAt: new Date('2099-12-31'),
        createdById: admin.userId,
      },
    });
    cellId = cell.id;
    await prisma.cellMembership.create({
      data: {
        cellId,
        userId: member.userId,
        role: 'MEMBER',
        startedAt: new Date('2026-01-01'),
      },
    });
    const news = await prisma.post.create({
      data: {
        board: 'CELL_NEWS',
        cellId,
        authorId: member.userId,
        title: `${FIXTURE_PREFIX}소식`,
        content: '본문',
        eventDate: new Date('2026-10-18'),
      },
    });
    newsId = news.id;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  const endpoints = () => [
    `/cells/${cellId}`,
    `/cells/${cellId}/gallery`,
    `/posts/cell-news?cellId=${cellId}`,
    `/posts/cell-news/${newsId}`,
  ];

  it('토큰 없이는 셀 상세·사진첩·소식 모두 401', async () => {
    for (const url of endpoints()) {
      await request(app.getHttpServer()).get(url).expect(401);
    }
  });

  it('그 셀 셀원이 아닌 일반 유저는 모두 403', async () => {
    for (const url of endpoints()) {
      await request(app.getHttpServer())
        .get(url)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(403);
    }
  });

  it('그 셀 셀원은 모두 200', async () => {
    for (const url of endpoints()) {
      await request(app.getHttpServer())
        .get(url)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
    }
  });

  it('관리자는 어느 셀이든 모두 200', async () => {
    for (const url of endpoints()) {
      await request(app.getHttpServer())
        .get(url)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    }
  });
});
