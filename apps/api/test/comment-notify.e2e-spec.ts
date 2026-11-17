import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { NotificationInfo, PostComment } from '@onnuri/shared';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { DEV_LOGIN_HEADER } from './dev-login';

// 댓글 알림 (SCRUM-215·216): 알림에 그 댓글 id가 실리고, 답글이면 원댓글 작성자에게도 간다.
describe('Comment notifications (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const DOMAIN = 'comment-notify-e2e.test';
  const tokens: Record<'author' | 'commenter' | 'replier', string> = {
    author: '',
    commenter: '',
    replier: '',
  };
  const ids: Record<keyof typeof tokens, string> = {
    author: '',
    commenter: '',
    replier: '',
  };
  let postId = '';

  const server = () => app.getHttpServer();
  const auth = (who: keyof typeof tokens) => ({
    Authorization: `Bearer ${tokens[who]}`,
  });
  const notificationsOf = async (who: keyof typeof tokens) =>
    (await request(server()).get('/notifications').set(auth(who)).expect(200))
      .body as NotificationInfo[];

  const cleanup = async () => {
    const users = await prisma.user.findMany({
      where: { email: { endsWith: `@${DOMAIN}` } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    await prisma.notification.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.comment.deleteMany({
      where: { authorId: { in: userIds }, parentId: { not: null } },
    });
    await prisma.comment.deleteMany({ where: { authorId: { in: userIds } } });
    await prisma.post.deleteMany({ where: { authorId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
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
    for (const who of ['author', 'commenter', 'replier'] as const) {
      const res = await request(server())
        .post('/auth/login/dev')
        .set(DEV_LOGIN_HEADER)
        .send({ email: `${who}@${DOMAIN}`, role: 'MEMBER' })
        .expect(201);
      const body = res.body as { accessToken: string; user: { id: string } };
      tokens[who] = body.accessToken;
      ids[who] = body.user.id;
    }
    const post = await prisma.post.create({
      data: {
        board: 'QT_SHARE',
        authorId: ids.author,
        title: '알림 테스트',
        content: '본문',
        eventDate: new Date(),
        qtShare: { create: { passage: '룻기 1:1' } },
      },
      select: { id: true },
    });
    postId = post.id;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('댓글 알림에 그 댓글 id가 실리고, 답글이면 원댓글 작성자에게도 간다', async () => {
    const comment = (
      await request(server())
        .post(`/posts/${postId}/comments`)
        .set(auth('commenter'))
        .send({ content: '댓글' })
        .expect(201)
    ).body as PostComment;
    const reply = (
      await request(server())
        .post(`/posts/${postId}/comments`)
        .set(auth('replier'))
        .send({ content: '답글', parentId: comment.id })
        .expect(201)
    ).body as PostComment;

    // 글 작성자: 댓글·답글 둘 다 (각각 그 댓글 id)
    const authorNotes = await notificationsOf('author');
    expect(authorNotes.map((n) => n.commentId).sort()).toEqual(
      [comment.id, reply.id].sort(),
    );
    expect(authorNotes.every((n) => n.linkUrl === `qt/${postId}`)).toBe(true);

    // 원댓글 작성자: 답글 알림 하나
    const commenterNotes = await notificationsOf('commenter');
    expect(commenterNotes).toHaveLength(1);
    expect(commenterNotes[0]).toMatchObject({
      title: '답글',
      commentId: reply.id,
    });

    // 답글 쓴 사람은 자기 알림을 받지 않는다
    expect(await notificationsOf('replier')).toHaveLength(0);
  });

  it('내 댓글에 내가 답글을 달면 나에게 알림이 가지 않는다', async () => {
    const mine = (
      await request(server())
        .post(`/posts/${postId}/comments`)
        .set(auth('replier'))
        .send({ content: '내 댓글' })
        .expect(201)
    ).body as PostComment;
    await request(server())
      .post(`/posts/${postId}/comments`)
      .set(auth('replier'))
      .send({ content: '내 답글', parentId: mine.id })
      .expect(201);
    expect(await notificationsOf('replier')).toHaveLength(0);
  });
});
