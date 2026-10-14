import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { BulletinDetail, BulletinListResponse } from '@onnuri/shared';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

// 공용 개발 DB를 쓰므로(ARCHITECTURE.md Known Issues) 실데이터와 안 겹치는 날짜·도메인을 쓴다.
// 회차(WorshipService)는 날짜가 unique라 테스트가 만든 회차만 지우려면 날짜가 겹치면 안 된다.
const EMAIL_DOMAIN = 'bulletins-e2e.test';
const ADMIN_EMAIL = `admin@${EMAIL_DOMAIN}`;
const MEMBER_EMAIL = `member@${EMAIL_DOMAIN}`;
const FIXTURE_DATE = '2001-01-07';
const IMAGE_URL = 'https://img.test/bulletins-e2e';

const body = {
  date: FIXTURE_DATE,
  bulletinImageUrls: [`${IMAGE_URL}/front.jpg`, `${IMAGE_URL}/back.jpg`],
  handoutImageUrls: [
    `${IMAGE_URL}/handout-1.jpg`,
    `${IMAGE_URL}/handout-2.jpg`,
  ],
};

describe('Bulletins (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let memberToken: string;

  const cleanup = async () => {
    // 이미지는 회차 삭제에 딸려 지워진다 (onDelete: Cascade).
    await prisma.worshipService.deleteMany({
      where: { date: new Date(FIXTURE_DATE) },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: `@${EMAIL_DOMAIN}` } },
    });
  };

  const login = async (email: string) => {
    const res = await request(app.getHttpServer())
      .post('/auth/login/dev')
      .send({ email })
      .expect(201);
    return res.body as { accessToken: string; user: { id: string } };
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

    const admin = await login(ADMIN_EMAIL);
    await prisma.user.update({
      where: { id: admin.user.id },
      data: { isAdmin: true },
    });
    adminToken = admin.accessToken;
    memberToken = (await login(MEMBER_EMAIL)).accessToken;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('토큰 없이 등록하면 401', async () => {
    await request(app.getHttpServer())
      .post('/bulletins')
      .send(body)
      .expect(401);
  });

  it('관리자가 아니면 등록할 수 없다 (403)', async () => {
    await request(app.getHttpServer())
      .post('/bulletins')
      .set('Authorization', `Bearer ${memberToken}`)
      .send(body)
      .expect(403);
  });

  it('주보가 2장이 아니면 400', async () => {
    await request(app.getHttpServer())
      .post('/bulletins')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...body, bulletinImageUrls: [`${IMAGE_URL}/front.jpg`] })
      .expect(400);
  });

  it('없는 날짜(2월 30일 등)면 400', async () => {
    await request(app.getHttpServer())
      .post('/bulletins')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...body, date: '2001-02-30' })
      .expect(400);
  });

  it('관리자는 등록하고, 같은 날짜로 다시 등록하면 400', async () => {
    const created = await request(app.getHttpServer())
      .post('/bulletins')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body)
      .expect(201);
    const detail = created.body as BulletinDetail;
    expect(detail.dateLabel).toBe('2001.01.07 (일)');
    expect(detail.title).toBeNull();
    expect(detail.bulletinImages.map((image) => image.url)).toEqual(
      body.bulletinImageUrls,
    );
    expect(detail.handoutImages.map((image) => image.url)).toEqual(
      body.handoutImageUrls,
    );

    await request(app.getHttpServer())
      .post('/bulletins')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body)
      .expect(400);
  });

  it('등록한 주보는 게스트도 목록·상세로 본다', async () => {
    const list = await request(app.getHttpServer())
      .get('/bulletins')
      .query({ month: '2001.01' })
      .expect(200);
    const listBody = list.body as BulletinListResponse;
    expect(listBody.selectedMonth).toBe('2001.01');
    expect(listBody.items).toHaveLength(1);

    const detail = await request(app.getHttpServer())
      .get(`/bulletins/${listBody.items[0].id}`)
      .expect(200);
    expect((detail.body as BulletinDetail).handoutImages).toHaveLength(2);

    await request(app.getHttpServer()).get('/bulletins/nope').expect(404);
  });
});
