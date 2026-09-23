import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { PrayerListItem, PrayerListResponse } from '@onnuri/shared';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

// 공용 개발 DB를 쓰므로 접두사/도메인으로 만든 행만 정리한다 (posts.e2e-spec과 같은 방식).
const EMAIL_DOMAIN = 'prayers-e2e.test';
const FIXTURE_PREFIX = 'prayers-e2e-';

// 실패해도 겉으로 티가 안 나는 것만 좁게 커버한다 (AGENTS.md 테스트 기준):
// 익명 글 실명 노출(관리자에게만), 남의 글 수정/삭제 거부, 공개기간 지난 글 숨김.
describe('Prayers (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let authorToken: string;
  let otherToken: string;
  let adminToken: string;
  let anonymousPostId: string;
  let namedPostId: string;

  const cleanup = async () => {
    await prisma.post.deleteMany({
      where: { title: { startsWith: FIXTURE_PREFIX } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: `@${EMAIL_DOMAIN}` } },
    });
  };

  const login = async (email: string, role?: 'ADMIN') => {
    const res = await request(app.getHttpServer())
      .post('/auth/login/dev')
      .send(role ? { email, role } : { email })
      .expect(201);
    return res.body as { accessToken: string; user: { id: string } };
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

    const author = await login(`author@${EMAIL_DOMAIN}`);
    const other = await login(`other@${EMAIL_DOMAIN}`);
    const admin = await login(`admin@${EMAIL_DOMAIN}`, 'ADMIN');
    authorToken = author.accessToken;
    otherToken = other.accessToken;
    adminToken = admin.accessToken;

    const future = new Date(Date.now() + 7 * 86_400_000)
      .toISOString()
      .slice(0, 10);

    const anonymous = await prisma.post.create({
      data: {
        board: 'PRAYER',
        authorId: author.user.id,
        title: `${FIXTURE_PREFIX}익명글`,
        content: '익명 본문',
        prayerRequest: {
          create: {
            category: 'HEALTH_DAILY',
            isAnonymous: true,
            visibleUntil: new Date(future),
          },
        },
      },
    });
    anonymousPostId = anonymous.id;

    const named = await prisma.post.create({
      data: {
        board: 'PRAYER',
        authorId: author.user.id,
        title: `${FIXTURE_PREFIX}실명글`,
        content: '실명 본문',
        prayerRequest: {
          create: {
            category: 'OTHER',
            isAnonymous: false,
            visibleUntil: new Date(future),
          },
        },
      },
    });
    namedPostId = named.id;

    // 공개기간이 지난 글 — 게시판 목록에서는 빠지고 내 목록에는 남아야 한다.
    await prisma.post.create({
      data: {
        board: 'PRAYER',
        authorId: author.user.id,
        title: `${FIXTURE_PREFIX}기간지난글`,
        content: '기간 지난 본문',
        prayerRequest: {
          create: {
            category: 'OTHER',
            isAnonymous: false,
            visibleUntil: new Date('2020-01-01'),
          },
        },
      },
    });
    // 원격 개발 DB(Supabase)라 픽스처 삽입만으로 Jest 기본 훅 타임아웃(5초)을 넘긴다.
  }, 30_000);

  afterAll(async () => {
    await cleanup();
    await app.close();
  }, 30_000);

  const getList = (token?: string) => {
    const req = request(app.getHttpServer()).get('/posts/prayers');
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

  const findFixtures = (body: PrayerListResponse) =>
    body.items.filter((item) => item.title.startsWith(FIXTURE_PREFIX));

  describe('익명 글 실명 노출 (관리자에게만)', () => {
    const findAnonymous = (items: PrayerListItem[]) =>
      items.find((item) => item.id === anonymousPostId);

    it('게스트에게는 "익명"이다', async () => {
      const res = await getList().expect(200);
      expect(findAnonymous(findFixtures(res.body as PrayerListResponse))?.authorName).toBe(
        '익명',
      );
    });

    it('일반 유저에게도 "익명"이다 — 실명이 새면 안 된다', async () => {
      const res = await getList(otherToken).expect(200);
      expect(findAnonymous(findFixtures(res.body as PrayerListResponse))?.authorName).toBe(
        '익명',
      );
    });

    it('관리자에게는 "익명(실명)"으로 온다 (확정 스펙)', async () => {
      const res = await getList(adminToken).expect(200);
      expect(
        findAnonymous(findFixtures(res.body as PrayerListResponse))?.authorName,
      ).toMatch(/^익명\(.+\)$/);
    });

    it('실명 글은 누구에게나 실명이다', async () => {
      const res = await getList().expect(200);
      const named = findFixtures(res.body as PrayerListResponse).find(
        (item) => item.id === namedPostId,
      );
      expect(named?.authorName).not.toBe('익명');
      expect(named?.authorName).toBeTruthy();
    });
  });

  describe('공개기간', () => {
    it('기간이 지난 글은 게시판 목록에서 빠진다', async () => {
      const res = await getList().expect(200);
      const titles = findFixtures(res.body as PrayerListResponse).map((i) => i.title);
      expect(titles).not.toContain(`${FIXTURE_PREFIX}기간지난글`);
    });

    it('기간이 지나도 내 목록에는 남는다 (수정·삭제해야 하므로)', async () => {
      const res = await request(app.getHttpServer())
        .get('/posts/prayers/mine')
        .set('Authorization', `Bearer ${authorToken}`)
        .expect(200);
      const titles = (res.body as PrayerListItem[]).map((i) => i.title);
      expect(titles).toContain(`${FIXTURE_PREFIX}기간지난글`);
    });
  });

  describe('인가·소유권', () => {
    it('토큰 없이 작성하면 401', () =>
      request(app.getHttpServer())
        .post('/posts/prayers')
        .send({
          title: `${FIXTURE_PREFIX}무단작성`,
          content: 'x',
          category: 'OTHER',
          isAnonymous: false,
          visibleUntil: '2027-01-01',
        })
        .expect(401));

    it('남의 글은 수정할 수 없다 (관리자도 수정은 없다 — 시안은 삭제만)', async () => {
      await request(app.getHttpServer())
        .patch(`/posts/prayers/${namedPostId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ title: `${FIXTURE_PREFIX}변조` })
        .expect(403);
      await request(app.getHttpServer())
        .patch(`/posts/prayers/${namedPostId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: `${FIXTURE_PREFIX}변조` })
        .expect(403);
    });

    it('남의 글은 삭제할 수 없다', () =>
      request(app.getHttpServer())
        .delete(`/posts/prayers/${namedPostId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403));

    it('관리자는 남의 글을 삭제할 수 있다 (확정 스펙: 모든 게시물 삭제)', async () => {
      await request(app.getHttpServer())
        .delete(`/posts/prayers/${namedPostId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const res = await getList().expect(200);
      const titles = findFixtures(res.body as PrayerListResponse).map((i) => i.title);
      expect(titles).not.toContain(`${FIXTURE_PREFIX}실명글`);
    });
  });
});
