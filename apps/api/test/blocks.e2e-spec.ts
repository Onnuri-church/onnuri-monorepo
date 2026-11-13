import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { BlockedUser } from '@onnuri/shared';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { DEV_LOGIN_HEADER } from './dev-login';

// 사용자 차단 (SCRUM-198): 차단하면 차단한 사람에게만 상대의 글·댓글이 빠지고, 풀면 돌아온다.
describe('User blocks (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const DOMAIN = 'blocks-e2e.test';
  const TEAM_NAME = '차단e2e팀';
  const tokens: Record<'a' | 'b' | 'c', string> = { a: '', b: '', c: '' };
  const ids: Record<'a' | 'b' | 'c', string> = { a: '', b: '', c: '' };
  let postId: string;
  let activityId: string;
  let teamId: string;

  const server = () => app.getHttpServer();
  const auth = (who: 'a' | 'b' | 'c') => ({
    Authorization: `Bearer ${tokens[who]}`,
  });

  const cleanup = async () => {
    const users = await prisma.user.findMany({
      where: { email: { endsWith: `@${DOMAIN}` } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    await prisma.comment.deleteMany({ where: { authorId: { in: userIds } } });
    await prisma.post.deleteMany({ where: { authorId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.team.deleteMany({ where: { name: TEAM_NAME } });
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

    for (const who of ['a', 'b', 'c'] as const) {
      const res = await request(server())
        .post('/auth/login/dev')
        .set(DEV_LOGIN_HEADER)
        .send({ email: `${who}@${DOMAIN}` })
        .expect(201);
      const body = res.body as { accessToken: string; user: { id: string } };
      tokens[who] = body.accessToken;
      ids[who] = body.user.id;
    }

    // B가 쓴 큐티나눔, 그리고 B가 쓴 부서활동 글에 C가 단 댓글
    const post = await prisma.post.create({
      data: {
        board: 'QT_SHARE',
        authorId: ids.b,
        title: '차단 테스트 큐티',
        content: '내용',
        eventDate: new Date(),
        qtShare: { create: {} },
      },
      select: { id: true },
    });
    postId = post.id;
    teamId = (await prisma.team.create({ data: { name: TEAM_NAME } })).id;
    const activity = await prisma.post.create({
      data: {
        board: 'TEAM_ACTIVITY',
        authorId: ids.b,
        teamId,
        title: '차단 테스트 활동',
        content: '내용',
        eventDate: new Date(),
        comments: { create: { authorId: ids.c, content: 'C의 댓글' } },
      },
      select: { id: true },
    });
    activityId = activity.id;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  const homeQtIds = async (who: 'a' | 'b' | 'c') => {
    const res = await request(server())
      .get('/posts/home')
      .set(auth(who))
      .expect(200);
    return (res.body as { qtShares: { id: string }[] }).qtShares.map(
      (p) => p.id,
    );
  };

  const commentAuthors = async (who: 'a' | 'b' | 'c') => {
    const res = await request(server())
      .get(`/posts/team-activities/${activityId}`)
      .set(auth(who))
      .expect(200);
    return (res.body as { comments: { authorName: string }[] }).comments.map(
      (c) => c.authorName,
    );
  };

  it('나 자신은 차단할 수 없다 (400)', () =>
    request(server())
      .post('/users/me/blocks')
      .set(auth('a'))
      .send({ userId: ids.a })
      .expect(400));

  it('없는 회원은 404', () =>
    request(server())
      .post('/users/me/blocks')
      .set(auth('a'))
      .send({ userId: 'no-such-user' })
      .expect(404));

  it('차단 전에는 B의 글과 C의 댓글이 보인다', async () => {
    expect(await homeQtIds('a')).toContain(postId);
    expect(await commentAuthors('a')).toHaveLength(1);
  });

  it('B를 차단하면 A에게만 B의 글이 빠지고, 두 번 눌러도 성공', async () => {
    await request(server())
      .post('/users/me/blocks')
      .set(auth('a'))
      .send({ userId: ids.b })
      .expect(204);
    await request(server())
      .post('/users/me/blocks')
      .set(auth('a'))
      .send({ userId: ids.b })
      .expect(204);

    expect(await homeQtIds('a')).not.toContain(postId);
    expect(await homeQtIds('c')).toContain(postId);

    const list = await request(server())
      .get('/users/me/blocks')
      .set(auth('a'))
      .expect(200);
    const blocked = list.body as BlockedUser[];
    expect(blocked.map((b) => b.userId)).toEqual([ids.b]);
  });

  it('C를 차단하면 C의 댓글이 B에게서 빠진다', async () => {
    await request(server())
      .post('/users/me/blocks')
      .set(auth('b'))
      .send({ userId: ids.c })
      .expect(204);
    expect(await commentAuthors('b')).toHaveLength(0);
  });

  it('차단을 풀면 다시 보인다', async () => {
    await request(server())
      .delete(`/users/me/blocks/${ids.b}`)
      .set(auth('a'))
      .expect(204);
    expect(await homeQtIds('a')).toContain(postId);
    const list = await request(server())
      .get('/users/me/blocks')
      .set(auth('a'))
      .expect(200);
    expect(list.body).toEqual([]);
  });
});
