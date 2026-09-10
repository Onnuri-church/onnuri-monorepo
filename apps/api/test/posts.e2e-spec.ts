import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { QtShareListResponse } from '@onnuri/shared';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

// 테스트 데이터 식별용 접두사/도메인 — 시작/종료 시 이 값들로 만든 행을 정리한다.
// 공용 개발 DB를 쓰므로(ARCHITECTURE.md Known Issues) 시드/실데이터와 안 겹치게 접두사를 붙인다.
const EMAIL_DOMAIN = 'posts-e2e.test';
const USER_EMAIL = `qt@${EMAIL_DOMAIN}`;
const FIXTURE_PREFIX = 'posts-e2e-';

describe('Posts (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let userId: string;
  let accessToken: string;
  let marchPostId: string;

  const cleanup = async () => {
    await prisma.post.deleteMany({
      where: { title: { startsWith: FIXTURE_PREFIX } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: `@${EMAIL_DOMAIN}` } },
    });
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    await cleanup();

    const login = await request(app.getHttpServer())
      .post('/auth/login/dev')
      .send({ email: USER_EMAIL })
      .expect(201);
    const loginBody = login.body as {
      accessToken: string;
      user: { id: string };
    };
    accessToken = loginBody.accessToken;
    userId = loginBody.user.id;

    // 픽스처는 시드(2026.03~05)와 안 겹치게 2025년으로 잡는다. 목록이 최신 달을 고르므로
    // 이 글들이 기본 조회에 잡히지 않아도 month를 지정해 검증한다.
    const created = await prisma.post.create({
      data: {
        board: 'QT_SHARE',
        authorId: userId,
        title: `${FIXTURE_PREFIX}3월글`,
        content: '3월 큐티 본문',
        eventDate: new Date('2025-03-11'),
        qtShare: { create: { passage: '룻기 1:1-5' } },
        likes: { create: [{ userId }] },
      },
    });
    marchPostId = created.id;

    await prisma.post.create({
      data: {
        board: 'QT_SHARE',
        authorId: userId,
        title: `${FIXTURE_PREFIX}2월글`,
        content: '2월 큐티 본문',
        eventDate: new Date('2025-02-20'),
        qtShare: { create: { passage: '룻기 1:6-10' } },
      },
    });

    // 삭제된 글은 목록에 안 나와야 한다.
    await prisma.post.create({
      data: {
        board: 'QT_SHARE',
        authorId: userId,
        title: `${FIXTURE_PREFIX}삭제된글`,
        content: '삭제된 큐티 본문',
        eventDate: new Date('2025-03-12'),
        deletedAt: new Date(),
        qtShare: { create: { passage: '룻기 1:11-14' } },
      },
    });
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  const getList = (query = '') =>
    request(app.getHttpServer())
      .get(`/posts/qt-shares${query}`)
      .set('Authorization', `Bearer ${accessToken}`);

  describe('큐티나눔 목록 (GET /posts/qt-shares)', () => {
    it('토큰 없이 401', () =>
      request(app.getHttpServer()).get('/posts/qt-shares').expect(401));

    it('잘못된 토큰이면 401', () =>
      request(app.getHttpServer())
        .get('/posts/qt-shares')
        .set('Authorization', 'Bearer not-a-real-token')
        .expect(401));

    it('month 형식이 YYYY.MM이 아니면 400', () => getList('?month=2025-03').expect(400));

    it('고른 달의 글만 준다 (다른 달이 섞이지 않는다)', async () => {
      const res = await getList('?month=2025.03').expect(200);

      const body = res.body as QtShareListResponse;
      expect(body.selectedMonth).toBe('2025.03');
      const titles = body.items.map((item) => item.title);
      expect(titles).toContain(`${FIXTURE_PREFIX}3월글`);
      expect(titles).not.toContain(`${FIXTURE_PREFIX}2월글`);
    });

    it('삭제된 글은 목록에 없다', async () => {
      const res = await getList('?month=2025.03').expect(200);

      const titles = (res.body as QtShareListResponse).items.map((i) => i.title);
      expect(titles).not.toContain(`${FIXTURE_PREFIX}삭제된글`);
    });

    it('날짜 라벨이 저장한 날과 같다 (타임존으로 하루 밀리지 않는다)', async () => {
      const res = await getList('?month=2025.03').expect(200);

      const item = (res.body as QtShareListResponse).items.find(
        (i) => i.id === marchPostId,
      );
      expect(item?.dateLabel).toBe('2025.03.11');
      expect(item?.likeCount).toBe(1);
      expect(item?.authorName).toBeTruthy();
    });

    it('월 목록은 글이 있는 달만 담고 최신순이다', async () => {
      const res = await getList().expect(200);

      const values = (res.body as QtShareListResponse).months.map((m) => m.value);
      expect(values).toContain('2025.03');
      expect(values).toContain('2025.02');
      // 픽스처에 1월 글이 없으므로 선택지에도 없어야 한다.
      expect(values).not.toContain('2025.01');
      expect([...values]).toEqual([...values].sort().reverse());
    });

    it('글이 없는 달을 요청하면 최신 달로 폴백하고 selectedMonth로 알려준다', async () => {
      const res = await getList('?month=2025.01').expect(200);

      const body = res.body as QtShareListResponse;
      expect(body.selectedMonth).not.toBe('2025.01');
      // 폴백 대상은 월 목록의 첫 항목(최신 달)이다 — 화면은 이 값을 선택 상태로 쓴다.
      expect(body.selectedMonth).toBe(body.months[0].value);
    });
  });
});
