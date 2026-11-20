import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { DEV_LOGIN_HEADER } from './dev-login';

// 회원탈퇴 정리 (SCRUM-274): 단톡방 멤버에서 빠지고, 리더가 나가면 관리자에게 알림이 가고,
// 탈퇴한 사람의 익명 글은 관리자에게도 실명이 보이지 않고, 관리자도 다른 관리자가 있으면 탈퇴할 수 있다.
describe('Withdraw cleanup (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const DOMAIN = 'withdraw-cleanup-e2e.test';
  const TEAM_NAME = 'e2e탈퇴정리팀';

  let admin: { accessToken: string; user: { id: string } };
  let leader: { accessToken: string; user: { id: string } };
  let member: { accessToken: string; user: { id: string } };
  let roomId = '';
  let postId = '';

  const server = () => app.getHttpServer();
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const cleanup = async () => {
    await prisma.post.deleteMany({
      where: { author: { email: { endsWith: `@${DOMAIN}` } } },
    });
    // 탈퇴하면 이메일이 예약 도메인으로 바뀐다 — 이름으로도 지운다.
    await prisma.post.deleteMany({
      where: { author: { name: { startsWith: 'e2e탈퇴' } } },
    });
    await prisma.team.deleteMany({ where: { name: TEAM_NAME } });
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { endsWith: `@${DOMAIN}` } },
          { name: { startsWith: 'e2e탈퇴' } },
        ],
      },
    });
  };

  const login = async (who: string, role: 'ADMIN' | 'MEMBER') => {
    const res = await request(server())
      .post('/auth/login/dev')
      .set(DEV_LOGIN_HEADER)
      .send({ email: `${who}@${DOMAIN}`, role })
      .expect(201);
    const body = res.body as { accessToken: string; user: { id: string } };
    await prisma.user.update({
      where: { id: body.user.id },
      data: { name: `e2e탈퇴${who}` },
    });
    return body;
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

    admin = await login('admin', 'ADMIN');
    leader = await login('leader', 'MEMBER');
    member = await login('member', 'MEMBER');

    const today = new Date();
    const team = await prisma.team.create({
      data: {
        name: TEAM_NAME,
        memberships: {
          create: [
            { userId: leader.user.id, role: 'LEADER', startedAt: today },
            { userId: member.user.id, role: 'MEMBER', startedAt: today },
          ],
        },
      },
    });
    const room = await prisma.chatRoom.create({
      data: {
        teamId: team.id,
        name: 'e2e탈퇴방',
        createdById: leader.user.id,
        members: {
          create: [{ userId: leader.user.id }, { userId: member.user.id }],
        },
      },
    });
    roomId = room.id;

    const post = await prisma.post.create({
      data: {
        board: 'QT_SHARE',
        authorId: leader.user.id,
        title: 'e2e 익명 나눔',
        content: '내용',
        eventDate: today,
        qtShare: { create: { isAnonymous: true } },
      },
    });
    postId = post.id;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('탈퇴 전에는 관리자에게 익명 글의 실명이 보인다', async () => {
    const res = await request(server())
      .get(`/posts/qt-shares/${postId}`)
      .set(auth(admin.accessToken))
      .expect(200);
    expect((res.body as { authorName: string }).authorName).toBe(
      '익명(e2e탈퇴leader)',
    );
  });

  it('팀장이 탈퇴하면 단톡방 멤버에서 빠지고 관리자에게 알림이 간다', async () => {
    await request(server())
      .delete('/users/me')
      .set(auth(leader.accessToken))
      .expect(204);

    const members = await prisma.chatRoomMember.findMany({
      where: { roomId },
      select: { userId: true },
    });
    expect(members.map((m) => m.userId)).toEqual([member.user.id]);

    const notice = await prisma.notification.findFirst({
      where: { userId: admin.user.id, type: 'MEMBER_LEFT' },
      orderBy: { createdAt: 'desc' },
    });
    expect(notice?.body).toContain('e2e탈퇴leader 님이 탈퇴했어요');
    expect(notice?.body).toContain(`${TEAM_NAME} 팀장(남은 팀장 없음)`);
    expect(notice?.linkUrl).toBe('admin/members');
  });

  it('탈퇴한 사람의 익명 글은 관리자에게도 실명이 보이지 않는다', async () => {
    const res = await request(server())
      .get(`/posts/qt-shares/${postId}`)
      .set(auth(admin.accessToken))
      .expect(200);
    expect((res.body as { authorName: string }).authorName).toBe('익명');
  });

  it('리더가 아닌 사람이 탈퇴하면 알림을 보내지 않는다', async () => {
    const before = await prisma.notification.count({
      where: { userId: admin.user.id, type: 'MEMBER_LEFT' },
    });
    await request(server())
      .delete('/users/me')
      .set(auth(member.accessToken))
      .expect(204);
    const after = await prisma.notification.count({
      where: { userId: admin.user.id, type: 'MEMBER_LEFT' },
    });
    expect(after).toBe(before);
  });

  it('관리자도 다른 관리자가 있으면 탈퇴할 수 있고, 남은 관리자에게 알린다', async () => {
    const second = await login('admin2', 'ADMIN');
    await request(server())
      .delete('/users/me')
      .set(auth(second.accessToken))
      .expect(204);

    const notice = await prisma.notification.findFirst({
      where: { userId: admin.user.id, type: 'MEMBER_LEFT' },
      orderBy: { createdAt: 'desc' },
    });
    expect(notice?.body).toBe('관리자 e2e탈퇴admin2 님이 탈퇴했어요.');
  });
});
