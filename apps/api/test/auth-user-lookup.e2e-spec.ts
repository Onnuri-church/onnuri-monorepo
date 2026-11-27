import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { DEV_LOGIN_HEADER } from './dev-login';

// 인증한 사용자 조회 재사용 (SCRUM-286): 토큰을 확인할 때 User를 한 번 읽고,
// 관리자 가드·이용 정지 확인은 그 결과를 다시 쓴다 — 요청 하나에 같은 사람을 두 번 읽지 않는다.
describe('Auth user lookup (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const DOMAIN = 'auth-lookup-e2e.test';
  const tokens = { member: '', admin: '' };
  const ids = { member: '', admin: '' };
  let postId: string;

  const server = () => app.getHttpServer();
  const auth = (who: keyof typeof tokens) => ({
    Authorization: `Bearer ${tokens[who]}`,
  });

  // 요청 하나가 처리되는 동안 User를 id로 조회한 횟수를 센다.
  const countUserLookups = async (send: () => Promise<unknown>) => {
    const spy = jest.spyOn(prisma.user, 'findUnique');
    try {
      await send();
      return spy.mock.calls.length;
    } finally {
      spy.mockRestore();
    }
  };

  const cleanup = async () => {
    const users = await prisma.user.findMany({
      where: { email: { endsWith: `@${DOMAIN}` } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
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

    for (const who of ['member', 'admin'] as const) {
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
        title: '조회 횟수 테스트',
        content: '본문',
        eventDate: new Date(),
        qtShare: { create: {} },
      },
      select: { id: true },
    });
    postId = post.id;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('관리자 API는 요청 하나에 User를 한 번만 읽는다', async () => {
    const lookups = await countUserLookups(() =>
      request(server()).get('/admin/off-days').set(auth('admin')),
    );
    expect(lookups).toBe(1);
  });

  it('댓글 쓰기(이용 정지 확인)는 정지 확인 때문에 User를 다시 읽지 않는다', async () => {
    const lookups = await countUserLookups(() =>
      request(server())
        .post(`/posts/${postId}/comments`)
        .set(auth('member'))
        .send({ content: '조회 횟수 테스트 댓글' }),
    );
    expect(lookups).toBe(1);
  });

  it('관리자가 아닌 사람은 관리자 API가 403이다', () =>
    request(server()).get('/admin/off-days').set(auth('member')).expect(403));

  it('탈퇴한 계정의 토큰은 401이다', async () => {
    await prisma.user.update({
      where: { id: ids.member },
      data: { withdrawnAt: new Date() },
    });
    await request(server()).get('/users/me').set(auth('member')).expect(401);
    await prisma.user.update({
      where: { id: ids.member },
      data: { withdrawnAt: null },
    });
  });
});
