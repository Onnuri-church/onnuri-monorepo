import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { DEV_LOGIN_HEADER, REVIEW_LOGIN } from './dev-login';

// 스토어 심사용 계정 (SCRUM-197): 숨은 로그인으로 심사 전용 계정에 들어가고, 그 계정과 심사용
// 팀·셀·소그룹·글은 실제 성도에게 보이지 않는다.
describe('Review account (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let reviewerToken: string;
  let reviewerId: string;
  let memberToken: string;
  let reviewGroupId: string;
  let reviewPostId: string;
  const MEMBER_EMAIL = 'review-e2e-member@test.invalid';

  const server = () => app.getHttpServer();

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

    const member = await request(server())
      .post('/auth/login/dev')
      .set(DEV_LOGIN_HEADER)
      .send({ email: MEMBER_EMAIL })
      .expect(201);
    memberToken = (member.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    if (reviewPostId) {
      await prisma.post.deleteMany({ where: { id: reviewPostId } });
    }
    await prisma.user.deleteMany({ where: { email: MEMBER_EMAIL } });
    await app.close();
  });

  it('비밀번호가 틀리면 401', () =>
    request(server())
      .post('/auth/login/review')
      .send({ id: REVIEW_LOGIN.id, password: 'wrong-password-123' })
      .expect(401));

  it('맞으면 심사 계정으로 로그인하고 심사용 팀·셀·소그룹이 준비된다', async () => {
    const res = await request(server())
      .post('/auth/login/review')
      .send(REVIEW_LOGIN)
      .expect(201);
    const body = res.body as { accessToken: string; user: { id: string } };
    reviewerToken = body.accessToken;
    reviewerId = body.user.id;

    const reviewer = await prisma.user.findUniqueOrThrow({
      where: { id: reviewerId },
      select: { isReviewAccount: true },
    });
    expect(reviewer.isReviewAccount).toBe(true);

    const group = await prisma.hobbyGroup.findFirstOrThrow({
      where: { isReviewOnly: true, members: { some: { userId: reviewerId } } },
      select: { postId: true },
    });
    reviewGroupId = group.postId;
  });

  it('다시 로그인해도 같은 계정·같은 소그룹이다 (멱등)', async () => {
    const res = await request(server())
      .post('/auth/login/review')
      .send(REVIEW_LOGIN)
      .expect(201);
    expect((res.body as { user: { id: string } }).user.id).toBe(reviewerId);
    const groups = await prisma.hobbyGroup.count({
      where: { isReviewOnly: true },
    });
    expect(groups).toBe(1);
  });

  it('팀·셀 선택지: 심사 계정은 심사용만, 실제 성도에게는 심사용이 없다', async () => {
    const reviewerTeams = await request(server())
      .get('/teams')
      .set('Authorization', `Bearer ${reviewerToken}`)
      .expect(200);
    const names = (reviewerTeams.body as { name: string }[]).map((t) => t.name);
    expect(names).toEqual(['심사용 팀']);

    const memberTeams = await request(server())
      .get('/teams')
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(
      (memberTeams.body as { name: string }[]).map((t) => t.name),
    ).not.toContain('심사용 팀');

    const memberCells = await request(server())
      .get('/cells')
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(
      (memberCells.body as { name: string }[]).map((c) => c.name),
    ).not.toContain('심사용 셀');
  });

  it('취향소그룹: 실제 성도의 목록에 없고 직접 열어도 404', async () => {
    const list = await request(server())
      .get('/group-meetings?status=open&limit=50')
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    const ids = (list.body as { items: { id: string }[] }).items.map(
      (g) => g.id,
    );
    expect(ids).not.toContain(reviewGroupId);

    await request(server())
      .get(`/group-meetings/${reviewGroupId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(404);
    await request(server())
      .post(`/group-meetings/${reviewGroupId}/join`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(404);

    const mine = await request(server())
      .get(`/group-meetings/${reviewGroupId}`)
      .set('Authorization', `Bearer ${reviewerToken}`)
      .expect(200);
    expect((mine.body as { id: string }).id).toBe(reviewGroupId);
  });

  it('심사 계정이 쓴 큐티나눔은 실제 성도에게 안 보이고 본인에게는 보인다', async () => {
    const post = await prisma.post.create({
      data: {
        board: 'QT_SHARE',
        authorId: reviewerId,
        title: '심사용 큐티',
        content: '심사용 내용',
        eventDate: new Date(),
        qtShare: { create: {} },
      },
      select: { id: true },
    });
    reviewPostId = post.id;

    const list = (token: string) =>
      request(server())
        .get('/posts/home')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    const ids = (body: unknown) =>
      (body as { qtShares: { id: string }[] }).qtShares.map((p) => p.id);

    expect(ids((await list(memberToken)).body)).not.toContain(reviewPostId);
    expect(ids((await list(reviewerToken)).body)).toContain(reviewPostId);
  });
});
