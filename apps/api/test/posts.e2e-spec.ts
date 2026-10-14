import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type {
  QtShareDetail,
  QtShareListResponse,
  TeamActivityDetail,
  TeamActivityListResponse,
} from '@onnuri/shared';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

// 테스트 데이터 식별용 접두사/도메인 — 시작/종료 시 이 값들로 만든 행을 정리한다.
// 공용 개발 DB를 쓰므로(ARCHITECTURE.md Known Issues) 시드/실데이터와 안 겹치게 접두사를 붙인다.
// 부서활동 픽스처가 만든 댓글은 글과 함께 지워진다 (Comment는 postId에 onDelete: Cascade).
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

    it('month가 1~12가 아니면 400', () => getList('?year=2025&month=13').expect(400));

    it('고른 달의 글만 준다 (다른 달이 섞이지 않는다)', async () => {
      const res = await getList('?year=2025&month=3').expect(200);

      const body = res.body as QtShareListResponse;
      expect(body.selectedYear).toBe(2025);
      expect(body.selectedMonth).toBe(3);
      const titles = body.items.map((item) => item.title);
      expect(titles).toContain(`${FIXTURE_PREFIX}3월글`);
      expect(titles).not.toContain(`${FIXTURE_PREFIX}2월글`);
    });

    it('삭제된 글은 목록에 없다', async () => {
      const res = await getList('?year=2025&month=3').expect(200);

      const titles = (res.body as QtShareListResponse).items.map((i) => i.title);
      expect(titles).not.toContain(`${FIXTURE_PREFIX}삭제된글`);
    });

    it('날짜 라벨이 저장한 날과 같다 (타임존으로 하루 밀리지 않는다)', async () => {
      const res = await getList('?year=2025&month=3').expect(200);

      const item = (res.body as QtShareListResponse).items.find(
        (i) => i.id === marchPostId,
      );
      expect(item?.dateLabel).toBe('2025.03.11');
      expect(item?.likeCount).toBe(1);
      expect(item?.authorName).toBeTruthy();
    });

    it('연도 선택지는 첫 글이 있는 해부터 올해까지 최신순이다', async () => {
      const res = await getList().expect(200);

      const years = (res.body as QtShareListResponse).years;
      expect(years).toContain(2025);
      expect(years[0]).toBe(new Date().getFullYear());
      expect([...years]).toEqual([...years].sort((a, b) => b - a));
    });

    it('연·월을 생략하면 글이 있는 가장 최근 달을 고른다', async () => {
      const res = await getList().expect(200);

      const body = res.body as QtShareListResponse;
      // 시드(2026.03~05)가 픽스처(2025)보다 최신이므로 그쪽이 선택된다.
      expect(body.selectedYear * 100 + body.selectedMonth).toBeGreaterThanOrEqual(202503);
      expect(body.items.length).toBeGreaterThan(0);
    });

    it('글이 없는 달을 고르면 폴백 없이 그 달 그대로 빈 목록을 준다', async () => {
      const res = await getList('?year=2025&month=1').expect(200);

      const body = res.body as QtShareListResponse;
      expect(body.selectedYear).toBe(2025);
      expect(body.selectedMonth).toBe(1);
      expect(body.items).toEqual([]);
    });

    it('mine=true면 내 글만 준다', async () => {
      const res = await getList('?mine=true&year=2025&month=3').expect(200);

      const items = (res.body as QtShareListResponse).items;
      expect(items.map((i) => i.id)).toContain(marchPostId);
      expect(items.every((i) => i.authorName)).toBe(true);
    });

    it('mine=true인데 연·월을 생략하면 내 글이 있는 가장 최근 달을 고른다', async () => {
      const res = await getList('?mine=true').expect(200);

      const body = res.body as QtShareListResponse;
      expect(body.selectedYear).toBe(2025);
      expect(body.selectedMonth).toBe(3);
    });

    it('mine=true인데 토큰이 없으면 401', () =>
      request(app.getHttpServer()).get('/posts/qt-shares?mine=true').expect(401));
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
      const res = await getList('?year=2025&month=3').expect(200);
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

  describe('부서활동 (GET /posts/team-activities)', () => {
    let snsTeamId: string;
    let praiseTeamId: string;
    let snsPostId: string;
    let rootCommentId: string;

    beforeAll(async () => {
      // 팀은 시드가 넣는 실데이터를 쓴다(이름이 유니크라 픽스처로 또 만들 수 없다).
      const sns = await prisma.team.findUnique({ where: { name: 'SNS팀' } });
      const praise = await prisma.team.findUnique({ where: { name: '찬양팀' } });
      snsTeamId = sns!.id;
      praiseTeamId = praise!.id;

      const snsPost = await prisma.post.create({
        data: {
          board: 'TEAM_ACTIVITY',
          authorId: userId,
          teamId: snsTeamId,
          title: `${FIXTURE_PREFIX}SNS활동`,
          content: '첫 줄\n둘째 줄',
          eventDate: new Date('2025-03-27'),
        },
      });
      snsPostId = snsPost.id;

      await prisma.post.create({
        data: {
          board: 'TEAM_ACTIVITY',
          authorId: userId,
          teamId: praiseTeamId,
          title: `${FIXTURE_PREFIX}찬양활동`,
          content: '찬양팀 본문',
          eventDate: new Date('2025-03-26'),
        },
      });
    }, 30_000);

    const getActivities = (query = '') =>
      request(app.getHttpServer()).get(`/posts/team-activities${query}`);

    const findFixture = async (query = '', title = `${FIXTURE_PREFIX}SNS활동`) => {
      const { body } = await getActivities(query).expect(200);
      const list = body as TeamActivityListResponse;
      return { list, item: list.items.find((post) => post.title === title) };
    };

    it('토큰 없이도 볼 수 있다', () => getActivities().expect(200));

    it('팀 이름이 아니라 색 키(department)를 내려준다', async () => {
      const { item } = await findFixture();
      expect(item?.department).toBe('sns');
      expect(item?.teamName).toBe('SNS팀');
    });

    it('필터 칩용 팀 목록을 같이 준다 (게스트는 GET /teams를 못 부른다)', async () => {
      const { list } = await findFixture();
      expect(list.teams.map((team) => team.name)).toContain('SNS팀');
      expect(list.selectedTeamId).toBeNull();
    });

    it('teamId를 주면 그 팀 글만 남는다', async () => {
      const { body } = await getActivities(`?teamId=${snsTeamId}`).expect(200);
      const list = body as TeamActivityListResponse;
      expect(list.selectedTeamId).toBe(snsTeamId);
      const fixtures = list.items.filter((post) =>
        post.title.startsWith(FIXTURE_PREFIX),
      );
      expect(fixtures.map((post) => post.title)).toEqual([
        `${FIXTURE_PREFIX}SNS활동`,
      ]);
    });

    it('없는 팀으로 거르면 빈 목록이 아니라 전체로 되돌린다', async () => {
      const { body } = await getActivities('?teamId=no-such-team').expect(200);
      const list = body as TeamActivityListResponse;
      expect(list.selectedTeamId).toBeNull();
      expect(list.items.length).toBeGreaterThan(0);
    });

    it('카드 미리보기는 본문 첫 줄만 쓴다', async () => {
      const { item } = await findFixture();
      expect(item?.description).toBe('첫 줄');
    });

    it('상세를 열면 조회수가 오른다', async () => {
      const before = await findFixture();
      await request(app.getHttpServer())
        .get(`/posts/team-activities/${snsPostId}`)
        .expect(200);

      const after = await findFixture();
      expect(after.item!.viewCount).toBe(before.item!.viewCount + 1);
    });

    it('큐티 글 id로 부르면 404 (게시판을 거른다)', () =>
      request(app.getHttpServer())
        .get(`/posts/team-activities/${marchPostId}`)
        .expect(404));

    it('토큰 없이 댓글을 달면 401', () =>
      request(app.getHttpServer())
        .post(`/posts/${snsPostId}/comments`)
        .send({ content: '게스트 댓글' })
        .expect(401));

    it('댓글을 달면 상세에 보이고 isMine이 true다', async () => {
      const { body } = await request(app.getHttpServer())
        .post(`/posts/${snsPostId}/comments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ content: '포스팅 가이드는 이전과 동일할까요?' })
        .expect(201);
      rootCommentId = (body as { id: string }).id;

      const detail = await request(app.getHttpServer())
        .get(`/posts/team-activities/${snsPostId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      const comments = (detail.body as TeamActivityDetail).comments;
      expect(comments).toHaveLength(1);
      expect(comments[0].isMine).toBe(true);
      expect(comments[0].replies).toEqual([]);
    });

    it('게스트로 보면 남의 댓글이라 isMine이 false다', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/posts/team-activities/${snsPostId}`)
        .expect(200);
      expect((body as TeamActivityDetail).comments[0].isMine).toBe(false);
    });

    it('대댓글은 부모 댓글의 replies에 들어가고, 댓글 수에는 안 들어간다', async () => {
      await request(app.getHttpServer())
        .post(`/posts/${snsPostId}/comments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ content: '네, 동일하게 부탁드려요!', parentId: rootCommentId })
        .expect(201);

      const detail = await request(app.getHttpServer())
        .get(`/posts/team-activities/${snsPostId}`)
        .expect(200);
      const comments = (detail.body as TeamActivityDetail).comments;
      expect(comments).toHaveLength(1);
      expect(comments[0].replies).toHaveLength(1);

      // 시안의 "댓글 2"는 최상위만 센 값이다 — 대댓글까지 세면 화면 숫자가 어긋난다.
      const { item } = await findFixture();
      expect(item?.commentCount).toBe(1);
    });

    it('대댓글에 또 답글을 달면 400 (1단계까지만)', async () => {
      const detail = await request(app.getHttpServer())
        .get(`/posts/team-activities/${snsPostId}`)
        .expect(200);
      const replyId = (detail.body as TeamActivityDetail).comments[0].replies[0]
        .id;

      await request(app.getHttpServer())
        .post(`/posts/${snsPostId}/comments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ content: '답글의 답글', parentId: replyId })
        .expect(400);
    });

    it('다른 글의 댓글을 부모로 주면 404', () =>
      request(app.getHttpServer())
        .post(`/posts/${marchPostId}/comments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ content: '엉뚱한 부모', parentId: rootCommentId })
        .expect(404));

    it('남의 댓글은 삭제할 수 없다 (403)', async () => {
      const stranger = await prisma.user.create({
        data: { email: `commenter@${EMAIL_DOMAIN}`, name: '남의댓글러' },
      });
      const othersComment = await prisma.comment.create({
        data: {
          postId: snsPostId,
          authorId: stranger.id,
          content: '남이 쓴 댓글',
        },
      });

      await request(app.getHttpServer())
        .delete(`/posts/${snsPostId}/comments/${othersComment.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      const detail = await request(app.getHttpServer())
        .get(`/posts/team-activities/${snsPostId}`)
        .expect(200);
      const contents = (detail.body as TeamActivityDetail).comments.map(
        (comment) => comment.content,
      );
      expect(contents).toContain('남이 쓴 댓글');
    });

    it('토큰 없이 글을 삭제하면 401', () =>
      request(app.getHttpServer())
        .delete(`/posts/team-activities/${snsPostId}`)
        .expect(401));

    it('남의 글은 삭제할 수 없다 (403)', async () => {
      const otherAuthor = await prisma.user.create({
        data: { email: `teamauthor@${EMAIL_DOMAIN}`, name: '남의부서글쓴이' },
      });
      const othersPost = await prisma.post.create({
        data: {
          board: 'TEAM_ACTIVITY',
          authorId: otherAuthor.id,
          teamId: praiseTeamId,
          title: `${FIXTURE_PREFIX}남의부서활동`,
          content: '남이 쓴 부서활동',
        },
      });

      await request(app.getHttpServer())
        .delete(`/posts/team-activities/${othersPost.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      // 튕겼으면 글이 그대로 남아 있어야 한다.
      await request(app.getHttpServer())
        .get(`/posts/team-activities/${othersPost.id}`)
        .expect(200);
    });

    it('내 글을 지우면 상세가 404가 되고 목록에서도 빠진다', async () => {
      const mine = await prisma.post.create({
        data: {
          board: 'TEAM_ACTIVITY',
          authorId: userId,
          teamId: praiseTeamId,
          title: `${FIXTURE_PREFIX}지울부서활동`,
          content: '지울 부서활동',
        },
      });

      await request(app.getHttpServer())
        .delete(`/posts/team-activities/${mine.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/posts/team-activities/${mine.id}`)
        .expect(404);

      const { list } = await findFixture('', `${FIXTURE_PREFIX}지울부서활동`);
      expect(list.items.map((post) => post.id)).not.toContain(mine.id);

      // 행은 남고 deletedAt만 채운다.
      const row = await prisma.post.findUnique({
        where: { id: mine.id },
        select: { deletedAt: true },
      });
      expect(row?.deletedAt).not.toBeNull();
    });

    it('이미 지운 글을 다시 지우면 404', async () => {
      const mine = await prisma.post.create({
        data: {
          board: 'TEAM_ACTIVITY',
          authorId: userId,
          teamId: praiseTeamId,
          title: `${FIXTURE_PREFIX}두번지울부서활동`,
          content: '두 번 지울 부서활동',
          deletedAt: new Date(),
        },
      });

      await request(app.getHttpServer())
        .delete(`/posts/team-activities/${mine.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    describe('작성 (POST /posts/team-activities)', () => {
      const body = {
        teamId: '',
        title: `${FIXTURE_PREFIX}작성한글`,
        content: '작성 테스트 본문',
        eventDate: '2025-03-28',
      };

      const create = (payload: Record<string, unknown>) =>
        request(app.getHttpServer())
          .post('/posts/team-activities')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(payload);

      it('토큰 없이 작성하면 401 (열람은 게스트도 되지만 작성은 아니다)', () =>
        request(app.getHttpServer())
          .post('/posts/team-activities')
          .send({ ...body, teamId: snsTeamId })
          .expect(401));

      it('그 팀 팀원이 아니면 403', () =>
        create({ ...body, teamId: snsTeamId }).expect(403));

      it('없는 부서면 404', () =>
        create({ ...body, teamId: 'no-such-team' }).expect(404));

      it('날짜가 YYYY-MM-DD가 아니면 400', () =>
        create({ ...body, teamId: snsTeamId, eventDate: '2025.03.28' }).expect(
          400,
        ));

      it('제목이 비어 있으면 400', () =>
        create({ ...body, teamId: snsTeamId, title: '' }).expect(400));

      it('사진이 5장을 넘으면 400 (작성 화면과 같은 상한)', () =>
        create({
          ...body,
          teamId: snsTeamId,
          imageUrls: Array.from({ length: 6 }, (_, i) => `https://img.test/${i}.jpg`),
        }).expect(400));

      it('팀원이면 작성되고, 상세 모양 그대로 돌아온다 (사진은 보낸 순서)', async () => {
        // 이 테스트 유저를 SNS팀에 넣어 작성 권한을 준다.
        await prisma.teamMembership.create({
          data: { teamId: snsTeamId, userId, startedAt: new Date() },
        });

        const res = await create({
          ...body,
          teamId: snsTeamId,
          imageUrls: ['https://img.test/a.jpg', 'https://img.test/b.jpg'],
        }).expect(201);

        const detail = res.body as TeamActivityDetail;
        expect(detail.teamName).toBe('SNS팀');
        expect(detail.department).toBe('sns');
        expect(detail.title).toBe(`${FIXTURE_PREFIX}작성한글`);
        expect(detail.imageUrls).toEqual([
          'https://img.test/a.jpg',
          'https://img.test/b.jpg',
        ]);
        expect(detail.isMine).toBe(true);
        expect(detail.comments).toEqual([]);
      });

      it('작성한 글이 목록에 보인다', async () => {
        const { item } = await findFixture('', `${FIXTURE_PREFIX}작성한글`);
        expect(item).toBeDefined();
        expect(item?.dateLabel).toBe('2025.03.28');
      });

      it('관리자는 팀원이 아니어도 쓸 수 있다', async () => {
        const admin = await prisma.user.create({
          data: {
            email: `teamadmin@${EMAIL_DOMAIN}`,
            name: '부서관리자',
            isAdmin: true,
          },
        });
        const login = await request(app.getHttpServer())
          .post('/auth/login/dev')
          .send({ email: admin.email })
          .expect(201);
        const adminToken = (login.body as { accessToken: string }).accessToken;

        await request(app.getHttpServer())
          .post('/posts/team-activities')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            ...body,
            teamId: praiseTeamId,
            title: `${FIXTURE_PREFIX}관리자글`,
          })
          .expect(201);
      });
    });

    it('내 댓글을 지우면 상세에서 빠진다 (행은 남는다)', async () => {
      await request(app.getHttpServer())
        .delete(`/posts/${snsPostId}/comments/${rootCommentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      const detail = await request(app.getHttpServer())
        .get(`/posts/team-activities/${snsPostId}`)
        .expect(200);
      const ids = (detail.body as TeamActivityDetail).comments.map(
        (comment) => comment.id,
      );
      expect(ids).not.toContain(rootCommentId);

      const row = await prisma.comment.findUnique({
        where: { id: rootCommentId },
        select: { deletedAt: true },
      });
      expect(row?.deletedAt).not.toBeNull();
    });
  });

  describe('큐티나눔 작성 (POST /posts/qt-shares)', () => {
    const body = () => ({
      eventDate: '2025-03-21',
      title: `${FIXTURE_PREFIX}작성글`,
      content: '작성한 큐티 본문',
      passage: '룻기 2:1-7',
      coverImageUrl: 'https://img.test/new-cover.jpg',
      imageUrls: ['https://img.test/new-1.jpg', 'https://img.test/new-2.jpg'],
    });

    const create = (data: Record<string, unknown>) =>
      request(app.getHttpServer())
        .post('/posts/qt-shares')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(data);

    it('토큰 없이 작성하면 401 (열람은 게스트도 되지만 작성은 아니다)', () =>
      request(app.getHttpServer())
        .post('/posts/qt-shares')
        .send(body())
        .expect(401));

    it('날짜가 YYYY-MM-DD가 아니면 400', () =>
      create({ ...body(), eventDate: '2025.03.21' }).expect(400));

    it('제목이 비어 있으면 400', () =>
      create({ ...body(), title: '' }).expect(400));

    it('본문사진이 5장을 넘으면 400 (작성 화면과 같은 상한)', () =>
      create({
        ...body(),
        imageUrls: Array.from(
          { length: 6 },
          (_, i) => `https://img.test/over-${i}.jpg`,
        ),
      }).expect(400));

    it('작성하면 상세 모양 그대로 돌아오고, 본문사진은 보낸 순서를 지킨다', async () => {
      const res = await create(body()).expect(201);

      const created = res.body as QtShareDetail;
      expect(created.title).toBe(`${FIXTURE_PREFIX}작성글`);
      expect(created.passage).toBe('룻기 2:1-7');
      expect(created.coverImageUrl).toBe('https://img.test/new-cover.jpg');
      expect(created.imageUrls).toEqual([
        'https://img.test/new-1.jpg',
        'https://img.test/new-2.jpg',
      ]);
      expect(created.isMine).toBe(true);
      expect(created.likeCount).toBe(0);
      // 저장할 때 로컬 타임존으로 날짜를 만들면 KST에서 하루 전으로 박힌다.
      expect(created.dateLabel).toBe('03월 21일');
    });

    it('작성한 글이 그 달 목록에 보인다', async () => {
      const res = await getList('?year=2025&month=3').expect(200);

      const titles = (res.body as QtShareListResponse).items.map((i) => i.title);
      expect(titles).toContain(`${FIXTURE_PREFIX}작성글`);
    });
  });

  describe('큐티나눔 수정·삭제 (PATCH·DELETE /posts/qt-shares/:id)', () => {
    let myPostId: string;

    // 수정/삭제가 글을 바꾸므로 테스트마다 새 글로 시작한다.
    beforeEach(async () => {
      const created = await prisma.post.create({
        data: {
          board: 'QT_SHARE',
          authorId: userId,
          title: `${FIXTURE_PREFIX}수정대상`,
          content: '수정 전 본문',
          eventDate: new Date('2025-04-02'),
          qtShare: { create: { passage: '룻기 3:1-5' } },
          images: {
            create: [
              {
                url: 'https://img.test/old-1.jpg',
                kind: 'POST_CONTENT',
                sortOrder: 1,
                uploadedById: userId,
              },
            ],
          },
        },
      });
      myPostId = created.id;
    });

    const patch = (id: string, data: Record<string, unknown>) =>
      request(app.getHttpServer())
        .patch(`/posts/qt-shares/${id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(data);

    const remove = (id: string) =>
      request(app.getHttpServer())
        .delete(`/posts/qt-shares/${id}`)
        .set('Authorization', `Bearer ${accessToken}`);

    it('토큰 없이 수정하면 401', () =>
      request(app.getHttpServer())
        .patch(`/posts/qt-shares/${myPostId}`)
        .send({ title: '몰래수정' })
        .expect(401));

    it('토큰 없이 삭제하면 401', () =>
      request(app.getHttpServer())
        .delete(`/posts/qt-shares/${myPostId}`)
        .expect(401));

    // 없는 글(404)과 구분한다 — 남의 글에 404를 주면 앱이 "사라진 글"로 잘못 안내한다.
    it('남의 글을 수정하면 403', () =>
      patch(othersPostId, { title: '남의글수정' }).expect(403));

    it('남의 글을 삭제하면 403', () => remove(othersPostId).expect(403));

    it('남의 글은 수정 요청이 튕겨도 내용이 그대로다', async () => {
      await patch(othersPostId, { title: '남의글수정' }).expect(403);

      const post = await prisma.post.findUnique({
        where: { id: othersPostId },
        select: { title: true },
      });
      expect(post?.title).toBe(`${FIXTURE_PREFIX}남의글`);
    });

    it('없는 글을 수정하면 404', () =>
      patch('no-such-post', { title: '아무거나' }).expect(404));

    it('보낸 항목만 바뀌고 나머지는 그대로다', async () => {
      const res = await patch(myPostId, { title: `${FIXTURE_PREFIX}수정됨` });
      expect(res.status).toBe(200);

      const updated = res.body as QtShareDetail;
      expect(updated.title).toBe(`${FIXTURE_PREFIX}수정됨`);
      expect(updated.content).toBe('수정 전 본문');
      expect(updated.passage).toBe('룻기 3:1-5');
      expect(updated.imageUrls).toEqual(['https://img.test/old-1.jpg']);
    });

    it('imageUrls를 보내면 기존 본문사진을 통째로 바꾼다 (지운 장이 남지 않는다)', async () => {
      const res = await patch(myPostId, {
        imageUrls: ['https://img.test/new-a.jpg', 'https://img.test/new-b.jpg'],
      }).expect(200);

      expect((res.body as QtShareDetail).imageUrls).toEqual([
        'https://img.test/new-a.jpg',
        'https://img.test/new-b.jpg',
      ]);
    });

    it('imageUrls를 빈 배열로 보내면 본문사진이 모두 사라진다', async () => {
      const res = await patch(myPostId, { imageUrls: [] }).expect(200);
      expect((res.body as QtShareDetail).imageUrls).toEqual([]);
    });

    it('passage를 null로 보내면 말씀이 지워진다', async () => {
      const res = await patch(myPostId, { passage: null }).expect(200);
      expect((res.body as QtShareDetail).passage).toBeNull();
    });

    it('삭제하면 상세가 404가 되고 목록에서도 빠진다', async () => {
      await remove(myPostId).expect(204);

      await request(app.getHttpServer())
        .get(`/posts/qt-shares/${myPostId}`)
        .expect(404);

      const list = await getList('?year=2025&month=4').expect(200);
      const ids = (list.body as QtShareListResponse).items.map((i) => i.id);
      expect(ids).not.toContain(myPostId);
    });

    // soft delete여야 한다 — 행이 사라지면 좋아요·댓글까지 연쇄로 날아간다.
    it('삭제는 행을 지우지 않고 deletedAt만 채운다', async () => {
      await remove(myPostId).expect(204);

      const post = await prisma.post.findUnique({
        where: { id: myPostId },
        select: { deletedAt: true },
      });
      expect(post?.deletedAt).not.toBeNull();
    });

    it('이미 삭제한 글을 다시 수정하면 404', async () => {
      await remove(myPostId).expect(204);
      await patch(myPostId, { title: '삭제후수정' }).expect(404);
    });
  });
});
