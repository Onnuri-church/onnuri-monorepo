import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { QtShareDetail, QtShareListResponse } from '@onnuri/shared';
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
  let deletedPostId: string;
  let othersPostId: string;
  let prayerPostId: string;

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
        coverImageUrl: 'https://img.test/cover.jpg',
        qtShare: { create: { passage: '룻기 1:1-5' } },
        likes: { create: [{ userId }] },
        // sortOrder와 반대로 넣는다 — 상세가 넣은 순서대로 주면 순서 보장이 안 되는 걸 잡는다.
        images: {
          create: [
            {
              url: 'https://img.test/body-2.jpg',
              kind: 'POST_CONTENT',
              sortOrder: 2,
              uploadedById: userId,
            },
            {
              url: 'https://img.test/body-1.jpg',
              kind: 'POST_CONTENT',
              sortOrder: 1,
              uploadedById: userId,
            },
          ],
        },
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

    // 삭제된 글은 목록에 안 나와야 하고, 좋아요도 받지 않아야 한다.
    const deleted = await prisma.post.create({
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
    deletedPostId = deleted.id;

    // 남이 쓴 글 — isMine을 작성자 비교로 계산하는지 확인용. 상수 true로 둬도 겉으로는 티가 안 난다.
    const otherAuthor = await prisma.user.create({
      data: { email: `author2@${EMAIL_DOMAIN}`, name: '남의작성자' },
    });
    const others = await prisma.post.create({
      data: {
        board: 'QT_SHARE',
        authorId: otherAuthor.id,
        title: `${FIXTURE_PREFIX}남의글`,
        content: '남이 쓴 큐티 본문',
        eventDate: new Date('2025-03-13'),
        qtShare: { create: { passage: '룻기 1:15-18' } },
      },
    });
    othersPostId = others.id;

    // 큐티가 아닌 글 — 상세 조회가 board를 안 거르면 이 글도 200으로 나간다.
    const prayer = await prisma.post.create({
      data: {
        board: 'PRAYER',
        authorId: userId,
        title: `${FIXTURE_PREFIX}기도제목글`,
        content: '기도제목 본문',
      },
    });
    prayerPostId = prayer.id;
    // 원격 개발 DB(Supabase)를 쓰므로 픽스처 삽입만으로 Jest 기본 훅 타임아웃(5초)을 넘긴다.
  }, 30_000);

  afterAll(async () => {
    await cleanup();
    await app.close();
  }, 30_000);

  const getList = (query = '') =>
    request(app.getHttpServer())
      .get(`/posts/qt-shares${query}`)
      .set('Authorization', `Bearer ${accessToken}`);

  describe('큐티나눔 목록 (GET /posts/qt-shares)', () => {
    // 열람은 게스트도 된다 (README 기능 범위). 로그인이 필요한 건 좋아요 같은 동작뿐이다.
    it('토큰 없이도 볼 수 있다', () =>
      request(app.getHttpServer()).get('/posts/qt-shares').expect(200));

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

  // 좋아요 describe보다 먼저 둔다 — 거기서 marchPostId의 좋아요 상태를 바꾸므로,
  // 여기서는 픽스처 초기 상태(내 좋아요 1개)를 그대로 본다.
  describe('큐티나눔 상세 (GET /posts/qt-shares/:id)', () => {
    const getDetail = (id: string) =>
      request(app.getHttpServer())
        .get(`/posts/qt-shares/${id}`)
        .set('Authorization', `Bearer ${accessToken}`);

    // 게스트에게는 "내" 상태가 없다. 픽스처의 3월글에는 내 좋아요가 1건 있는데,
    // 그게 게스트 응답에서 likedByMe로 새어 나오면 안 된다 — Prisma가 where의
    // undefined를 조건 없음으로 보기 때문에 그냥 넘기면 조용히 true가 된다.
    it('토큰 없이도 볼 수 있고, likedByMe·isMine이 false다', async () => {
      const res = await request(app.getHttpServer())
        .get(`/posts/qt-shares/${marchPostId}`)
        .expect(200);

      const body = res.body as QtShareDetail;
      expect(body.title).toBe(`${FIXTURE_PREFIX}3월글`);
      expect(body.likeCount).toBe(1);
      expect(body.likedByMe).toBe(false);
      expect(body.isMine).toBe(false);
    });

    it('잘못된 토큰이면 401 (만료를 게스트로 조용히 넘기지 않는다)', () =>
      request(app.getHttpServer())
        .get(`/posts/qt-shares/${marchPostId}`)
        .set('Authorization', 'Bearer not-a-real-token')
        .expect(401));

    it('없는 글이면 404', () => getDetail('no-such-post').expect(404));

    it('삭제된 글이면 404', () => getDetail(deletedPostId).expect(404));

    it('큐티가 아닌 게시판 글이면 404', () =>
      getDetail(prayerPostId).expect(404));

    it('상세 필드를 화면이 쓰는 모양 그대로 준다', async () => {
      const res = await getDetail(marchPostId).expect(200);

      const body = res.body as QtShareDetail;
      expect(body.title).toBe(`${FIXTURE_PREFIX}3월글`);
      expect(body.content).toBe('3월 큐티 본문');
      // 목록에선 안 쓰던 필드 — 상세에만 나온다.
      expect(body.passage).toBe('룻기 1:1-5');
      expect(body.authorName).toBeTruthy();
      expect(body.likeCount).toBe(1);
      expect(body.likedByMe).toBe(true);
    });

    it('날짜 라벨이 저장한 날과 같다 (타임존으로 하루 밀리지 않는다)', async () => {
      const res = await getDetail(marchPostId).expect(200);

      // 목록의 dateLabel("2025.03.11")과 형식이 다르다 — 상세 화면 문구를 따른 것.
      expect((res.body as QtShareDetail).dateLabel).toBe('03월 11일');
    });

    // 작성 화면이 배경사진(1장)과 본문사진(최대 5장)을 따로 받는다. 배경만 내려주면
    // 올린 본문사진을 어디서도 볼 수 없는데, 화면상으로는 사진이 없는 글과 구분이 안 된다.
    it('배경사진과 본문사진을 따로 주고, 본문사진은 sortOrder 순이다', async () => {
      const res = await getDetail(marchPostId).expect(200);

      const body = res.body as QtShareDetail;
      expect(body.coverImageUrl).toBe('https://img.test/cover.jpg');
      expect(body.imageUrls).toEqual([
        'https://img.test/body-1.jpg',
        'https://img.test/body-2.jpg',
      ]);
    });

    it('사진이 없는 글은 imageUrls가 빈 배열이다', async () => {
      const res = await getDetail(othersPostId).expect(200);

      const body = res.body as QtShareDetail;
      expect(body.coverImageUrl).toBeNull();
      expect(body.imageUrls).toEqual([]);
    });

    it('createdAt은 문구가 아니라 ISO로 내려준다 (앱이 "38분 전"을 계산한다)', async () => {
      const res = await getDetail(marchPostId).expect(200);

      const { createdAt } = res.body as QtShareDetail;
      expect(new Date(createdAt).toISOString()).toBe(createdAt);
    });

    it('내 글이면 isMine이 true다', async () => {
      const res = await getDetail(marchPostId).expect(200);
      expect((res.body as QtShareDetail).isMine).toBe(true);
    });

    it('남이 쓴 글이면 isMine이 false다', async () => {
      const res = await getDetail(othersPostId).expect(200);

      const body = res.body as QtShareDetail;
      expect(body.isMine).toBe(false);
      expect(body.authorName).toBe('남의작성자');
    });
  });

  describe('좋아요 (POST/DELETE /posts/:id/likes)', () => {
    // 이 describe는 marchPostId의 좋아요 상태를 바꾸므로, 끝나면 픽스처가 만든
    // 초기 상태(내 좋아요 1개)로 되돌려 다른 테스트에 영향을 주지 않게 한다.
    afterAll(async () => {
      await prisma.postLike.deleteMany({ where: { postId: marchPostId } });
      await prisma.postLike.create({ data: { postId: marchPostId, userId } });
    });

    const findMarchPost = async () => {
      const res = await getList('?month=2025.03').expect(200);
      return (res.body as QtShareListResponse).items.find(
        (item) => item.id === marchPostId,
      );
    };

    it('토큰 없이 좋아요는 401', () =>
      request(app.getHttpServer())
        .post(`/posts/${marchPostId}/likes`)
        .expect(401));

    it('토큰 없이 좋아요 취소는 401', () =>
      request(app.getHttpServer())
        .delete(`/posts/${marchPostId}/likes`)
        .expect(401));

    it('없는 글에 좋아요하면 404', () =>
      request(app.getHttpServer())
        .post('/posts/no-such-post/likes')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404));

    it('삭제된 글에 좋아요하면 404 (목록에서 빠진 글에 붙지 않게)', () =>
      request(app.getHttpServer())
        .post(`/posts/${deletedPostId}/likes`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404));

    it('좋아요를 취소하면 개수가 줄고 likedByMe가 false가 된다', async () => {
      await request(app.getHttpServer())
        .delete(`/posts/${marchPostId}/likes`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      const item = await findMarchPost();
      expect(item?.likeCount).toBe(0);
      expect(item?.likedByMe).toBe(false);
    });

    it('누르지 않은 글의 좋아요를 취소해도 에러가 아니다 (재시도 대비)', () =>
      request(app.getHttpServer())
        .delete(`/posts/${marchPostId}/likes`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204));

    it('좋아요하면 개수가 늘고 likedByMe가 true가 된다', async () => {
      await request(app.getHttpServer())
        .post(`/posts/${marchPostId}/likes`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      const item = await findMarchPost();
      expect(item?.likeCount).toBe(1);
      expect(item?.likedByMe).toBe(true);
    });

    it('같은 글에 두 번 좋아요해도 개수가 늘지 않는다 (멱등)', async () => {
      await request(app.getHttpServer())
        .post(`/posts/${marchPostId}/likes`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      const item = await findMarchPost();
      expect(item?.likeCount).toBe(1);
    });

    it('남이 누른 좋아요는 개수에 들어가지만 내 likedByMe는 false다', async () => {
      const other = await prisma.user.create({
        data: { email: `other@${EMAIL_DOMAIN}`, name: '다른사람' },
      });
      await prisma.postLike.create({
        data: { postId: marchPostId, userId: other.id },
      });

      const item = await findMarchPost();
      expect(item?.likeCount).toBe(2);
      expect(item?.likedByMe).toBe(true);

      // 내 좋아요만 빼면 개수는 남고 likedByMe만 꺼진다.
      await request(app.getHttpServer())
        .delete(`/posts/${marchPostId}/likes`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      const after = await findMarchPost();
      expect(after?.likeCount).toBe(1);
      expect(after?.likedByMe).toBe(false);
    });
  });
});
