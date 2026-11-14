import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type {
  AdminMemberDetail,
  AdminReportItem,
  MeResponse,
} from '@onnuri/shared';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { DEV_LOGIN_HEADER } from './dev-login';

// 이용 정지 (SCRUM-204): 관리자가 정지하면 글·댓글을 쓸 수 없고 읽기는 그대로다.
// 기간이 지나거나 해제하면 다시 쓸 수 있다. 관리자·본인은 정지할 수 없다.
describe('Suspension (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const DOMAIN = 'suspension-e2e.test';
  const tokens: Record<'member' | 'reporter' | 'admin', string> = {
    member: '',
    reporter: '',
    admin: '',
  };
  const ids: Record<keyof typeof tokens, string> = {
    member: '',
    reporter: '',
    admin: '',
  };
  let postId: string;

  const server = () => app.getHttpServer();
  const auth = (who: keyof typeof tokens) => ({
    Authorization: `Bearer ${tokens[who]}`,
  });
  const comment = (who: keyof typeof tokens) =>
    request(server())
      .post(`/posts/${postId}/comments`)
      .set(auth(who))
      .send({ content: '정지 테스트 댓글' });
  const suspend = (targetId: string, body: Record<string, unknown>) =>
    request(server())
      .put(`/users/${targetId}/suspension`)
      .set(auth('admin'))
      .send(body);

  const cleanup = async () => {
    const users = await prisma.user.findMany({
      where: { email: { endsWith: `@${DOMAIN}` } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    await prisma.report.deleteMany({ where: { reporterId: { in: userIds } } });
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

    for (const who of ['member', 'reporter', 'admin'] as const) {
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
        authorId: ids.member,
        title: '정지 테스트',
        content: '본문',
        eventDate: new Date(),
        qtShare: { create: {} },
      },
      select: { id: true },
    });
    postId = post.id;
  });

  afterEach(async () => {
    await prisma.user.updateMany({
      where: { email: { endsWith: `@${DOMAIN}` } },
      data: { suspendedUntil: null },
    });
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('정지 전에는 댓글을 쓸 수 있다', () => comment('member').expect(201));

  it('관리자가 7일 정지하면 댓글이 403 USER_SUSPENDED이고 끝나는 날이 안내된다', async () => {
    const res = await suspend(ids.member, { days: 7 }).expect(200);
    expect((res.body as AdminMemberDetail).suspensionLabel).toMatch(/까지$/);

    const blocked = await comment('member').expect(403);
    const body = blocked.body as { code: string; message: string };
    expect(body.code).toBe('USER_SUSPENDED');
    expect(body.message).toContain('이용이 제한된 계정');
  });

  it('정지 중에도 글 읽기는 된다', async () => {
    await suspend(ids.member, {}).expect(200);
    await request(server())
      .get(`/posts/qt-shares/${postId}`)
      .set(auth('member'))
      .expect(200);
  });

  it('해제할 때까지 정지하면 /users/me에 정지 정보가 나온다', async () => {
    await suspend(ids.member, {}).expect(200);
    const me = await request(server())
      .get('/users/me')
      .set(auth('member'))
      .expect(200);
    expect((me.body as MeResponse).suspension?.label).toBe('해제할 때까지');
  });

  it('해제하면 다시 쓸 수 있다', async () => {
    await suspend(ids.member, { days: 30 }).expect(200);
    const res = await request(server())
      .delete(`/users/${ids.member}/suspension`)
      .set(auth('admin'))
      .expect(200);
    expect((res.body as AdminMemberDetail).suspensionLabel).toBeNull();
    await comment('member').expect(201);
  });

  it('기간이 지나면 자동으로 풀린다', async () => {
    await prisma.user.update({
      where: { id: ids.member },
      data: { suspendedUntil: new Date(Date.now() - 1000) },
    });
    await comment('member').expect(201);
    const me = await request(server())
      .get('/users/me')
      .set(auth('member'))
      .expect(200);
    expect((me.body as MeResponse).suspension).toBeNull();
  });

  it('정지 기간은 7·30일 또는 해제할 때까지만 된다', () =>
    suspend(ids.member, { days: 3 }).expect(400));

  it('관리자는 정지할 수 없다', () => suspend(ids.admin, {}).expect(400));

  it('관리자가 아니면 정지할 수 없다', () =>
    request(server())
      .put(`/users/${ids.member}/suspension`)
      .set(auth('reporter'))
      .send({})
      .expect(403));

  it('신고 목록에 작성자 id와 정지 여부가 나온다', async () => {
    await request(server())
      .post('/reports')
      .set(auth('reporter'))
      .send({ targetType: 'POST', targetId: postId, reason: 'ABUSE' })
      .expect(204);
    await suspend(ids.member, { days: 7 }).expect(200);

    const res = await request(server())
      .get('/admin/reports')
      .set(auth('admin'))
      .expect(200);
    const item = (res.body as AdminReportItem[]).find(
      (r) => r.targetId === postId,
    );
    expect(item?.targetAuthorId).toBe(ids.member);
    expect(item?.targetAuthorSuspended).toBe(true);
  });
});
