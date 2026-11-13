import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { AdminReportItem } from '@onnuri/shared';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { DEV_LOGIN_HEADER } from './dev-login';

// 신고 (SCRUM-199): 신고하면 관리자 목록에 오고 관리자에게 알림이 가며, 숨기면 글이 내려간다.
describe('Reports (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const DOMAIN = 'reports-e2e.test';
  const tokens: Record<'author' | 'reporter' | 'other' | 'admin', string> = {
    author: '',
    reporter: '',
    other: '',
    admin: '',
  };
  const ids: Record<keyof typeof tokens, string> = {
    author: '',
    reporter: '',
    other: '',
    admin: '',
  };
  let postId: string;
  let commentId: string;

  const server = () => app.getHttpServer();
  const auth = (who: keyof typeof tokens) => ({
    Authorization: `Bearer ${tokens[who]}`,
  });

  const cleanup = async () => {
    const users = await prisma.user.findMany({
      where: { email: { endsWith: `@${DOMAIN}` } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    await prisma.report.deleteMany({
      where: { reporterId: { in: userIds } },
    });
    await prisma.notification.deleteMany({
      where: { userId: { in: userIds } },
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

    for (const who of ['author', 'reporter', 'other', 'admin'] as const) {
      const res = await request(server())
        .post('/auth/login/dev')
        .set(DEV_LOGIN_HEADER)
        .send({
          email: `${who}@${DOMAIN}`,
          role: who === 'admin' ? 'ADMIN' : 'MEMBER',
        })
        .expect(201);
      const body = res.body as { accessToken: string; user: { id: string } };
      tokens[who] = body.accessToken;
      ids[who] = body.user.id;
    }

    const post = await prisma.post.create({
      data: {
        board: 'QT_SHARE',
        authorId: ids.author,
        title: '신고 테스트',
        content: '문제 있는 내용',
        eventDate: new Date(),
        qtShare: { create: {} },
        comments: { create: { authorId: ids.author, content: '문제 댓글' } },
      },
      select: { id: true, comments: { select: { id: true } } },
    });
    postId = post.id;
    commentId = post.comments[0].id;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  const openReports = async () => {
    const res = await request(server())
      .get('/admin/reports')
      .set(auth('admin'))
      .expect(200);
    return (res.body as AdminReportItem[]).filter((r) => r.targetId === postId);
  };

  it('내 글은 신고할 수 없다 (400)', () =>
    request(server())
      .post('/reports')
      .set(auth('author'))
      .send({ targetType: 'POST', targetId: postId, reason: 'SPAM' })
      .expect(400));

  it('없는 글은 404, 잘못된 사유는 400', async () => {
    await request(server())
      .post('/reports')
      .set(auth('reporter'))
      .send({ targetType: 'POST', targetId: 'nope', reason: 'SPAM' })
      .expect(404);
    await request(server())
      .post('/reports')
      .set(auth('reporter'))
      .send({ targetType: 'POST', targetId: postId, reason: 'WHATEVER' })
      .expect(400);
  });

  it('일반 회원은 관리자 목록을 볼 수 없다 (403)', () =>
    request(server()).get('/admin/reports').set(auth('reporter')).expect(403));

  it('신고하면 관리자 목록에 오고 관리자에게 알림이 간다 — 같은 사람이 다시 신고해도 한 건', async () => {
    for (let i = 0; i < 2; i++) {
      await request(server())
        .post('/reports')
        .set(auth('reporter'))
        .send({
          targetType: 'POST',
          targetId: postId,
          reason: 'ABUSE',
          detail: '욕설',
        })
        .expect(204);
    }
    await request(server())
      .post('/reports')
      .set(auth('other'))
      .send({ targetType: 'POST', targetId: postId, reason: 'SPAM' })
      .expect(204);

    const reports = await openReports();
    expect(reports).toHaveLength(2);
    expect(reports[0].snapshot).toContain('문제 있는 내용');
    expect(reports[0].openCountForTarget).toBe(2);

    const notes = await prisma.notification.count({
      where: { userId: ids.admin, type: 'REPORT' },
    });
    expect(notes).toBe(2);
  });

  it('숨기면 글이 내려가고 같은 글의 신고가 모두 처리된다', async () => {
    const [first] = await openReports();
    await request(server())
      .patch(`/admin/reports/${first.id}`)
      .set(auth('admin'))
      .send({ action: 'hide' })
      .expect(204);

    expect(await openReports()).toHaveLength(0);
    const post = await prisma.post.findUniqueOrThrow({
      where: { id: postId },
      select: { deletedAt: true },
    });
    expect(post.deletedAt).not.toBeNull();
  });

  it('넘기면(dismiss) 글은 그대로 남는다', async () => {
    await request(server())
      .post('/reports')
      .set(auth('reporter'))
      .send({ targetType: 'COMMENT', targetId: commentId, reason: 'OTHER' })
      .expect(204);
    const res = await request(server())
      .get('/admin/reports')
      .set(auth('admin'))
      .expect(200);
    const report = (res.body as AdminReportItem[]).find(
      (r) => r.targetId === commentId,
    );
    expect(report).toBeDefined();
    await request(server())
      .patch(`/admin/reports/${report!.id}`)
      .set(auth('admin'))
      .send({ action: 'dismiss' })
      .expect(204);
    const comment = await prisma.comment.findUniqueOrThrow({
      where: { id: commentId },
      select: { deletedAt: true },
    });
    expect(comment.deletedAt).toBeNull();
  });
});
