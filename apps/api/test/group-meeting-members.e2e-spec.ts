import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { GroupMeetingDetail } from '@onnuri/shared';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { DEV_LOGIN_HEADER } from './dev-login';

// 공용 개발 DB라 시드·실데이터와 안 겹치게 도메인/제목 접두사를 붙이고 정리 때 지운다.
const EMAIL_DOMAIN = 'group-members-e2e.test';
const TITLE = 'group-members-e2e 소그룹';

// 취향 소그룹 멤버 관리 (SCRUM-188): 소그룹장·관리자의 승인·내보내기,
// 소그룹장 임명·해제는 관리자만, 소그룹장은 항상 한 명 이상.
describe('Group meeting members (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let groupId: string;
  const users: Record<string, { token: string; userId: string }> = {};

  const cleanup = async () => {
    await prisma.post.deleteMany({ where: { board: 'HOBBY_GROUP', title: TITLE } });
    await prisma.user.deleteMany({ where: { email: { endsWith: `@${EMAIL_DOMAIN}` } } });
  };

  const devLogin = async (name: string, role?: 'ADMIN') => {
    const res = await request(app.getHttpServer())
      .post('/auth/login/dev')
      .set(DEV_LOGIN_HEADER)
      .send({ email: `${name}@${EMAIL_DOMAIN}`, ...(role ? { role } : {}) })
      .expect(201);
    const body = res.body as { accessToken: string; user: { id: string } };
    return { token: body.accessToken, userId: body.user.id };
  };

  const as = (name: string) => ({ Authorization: `Bearer ${users[name].token}` });
  const server = () => app.getHttpServer();

  const join = (name: string) =>
    request(server()).post(`/group-meetings/${groupId}/join`).set(as(name)).expect(201);
  const approve = (by: string, target: string) =>
    request(server())
      .patch(`/group-meetings/${groupId}/members/${users[target].userId}`)
      .set(as(by))
      .send({ status: 'APPROVED' })
      .expect(200);
  const kick = (by: string, target: string) =>
    request(server())
      .delete(`/group-meetings/${groupId}/members/${users[target].userId}`)
      .set(as(by));
  const setLeaders = (by: string, names: string[]) =>
    request(server())
      .patch(`/group-meetings/${groupId}`)
      .set(as(by))
      .send({ leaderIds: names.map((name) => users[name].userId) });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    await cleanup();

    users.admin = await devLogin('admin', 'ADMIN');
    for (const name of ['leaderA', 'leaderB', 'memberA', 'memberB']) {
      users[name] = await devLogin(name.toLowerCase());
    }

    const today = new Date();
    const end = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
    const res = await request(server())
      .post('/group-meetings')
      .set(as('admin'))
      .send({
        title: TITLE,
        description: '설명',
        recruitStart: today.toISOString().slice(0, 10),
        recruitEnd: end.toISOString().slice(0, 10),
        place: '교회',
        cost: '무료',
        leaderIds: [users.leaderA.userId, users.leaderB.userId],
      })
      .expect(201);
    groupId = (res.body as GroupMeetingDetail).id;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('생성 때 지정된 소그룹장들에게 임명 알림이 간다', async () => {
    for (const name of ['leaderA', 'leaderB']) {
      const count = await prisma.notification.count({
        where: { userId: users[name].userId, body: { contains: '소그룹장으로 지정됐어요' } },
      });
      expect(count).toBe(1);
    }
  });

  it('소그룹장이 신청을 승인하고, 참여 중인 멤버를 내보낸다', async () => {
    await join('memberA');
    await approve('leaderA', 'memberA');

    const res = await kick('leaderB', 'memberA').expect(200);
    const detail = res.body as GroupMeetingDetail;
    expect(detail.members.map((m) => m.id)).not.toContain(users.memberA.userId);

    const notified = await prisma.notification.count({
      where: { userId: users.memberA.userId, body: { contains: '참여가 해제됐어요' } },
    });
    expect(notified).toBe(1);
  });

  it('내보내진 멤버는 다시 신청할 수 있다', async () => {
    await join('memberA');
    await approve('leaderA', 'memberA');
  });

  it('소그룹장은 내보낼 수 없다', async () => {
    await kick('admin', 'leaderB').expect(400);
  });

  it('일반 멤버는 다른 멤버를 내보낼 수 없다', async () => {
    await join('memberB');
    await approve('admin', 'memberB');
    await kick('memberB', 'memberA').expect(403);
  });

  it('소그룹장 본인도 내보낼 수 없고, 참여 중이 아닌 사람은 찾을 수 없다', async () => {
    await kick('leaderA', 'leaderA').expect(400);
    await request(server())
      .delete(`/group-meetings/${groupId}/members/not-a-member`)
      .set(as('leaderA'))
      .expect(404);
  });

  it('소그룹장은 소그룹장 명단을 바꿀 수 없지만, 같은 명단을 다시 보내는 건 허용된다', async () => {
    await setLeaders('leaderA', ['leaderA']).expect(403);
    await setLeaders('leaderA', ['leaderB', 'leaderA']).expect(200);
  });

  it('관리자가 소그룹장을 바꾸면 임명·해제 알림이 가고, 해제된 사람은 멤버로 남는다', async () => {
    const res = await setLeaders('admin', ['leaderA', 'memberB']).expect(200);
    const detail = res.body as GroupMeetingDetail;
    expect(detail.leaders.map((l) => l.id).sort()).toEqual(
      [users.leaderA.userId, users.memberB.userId].sort(),
    );
    const leaderB = detail.members.find((m) => m.id === users.leaderB.userId);
    expect(leaderB?.isLeader).toBe(false);

    const dismissed = await prisma.notification.count({
      where: { userId: users.leaderB.userId, body: { contains: '소그룹장에서 해제됐어요' } },
    });
    const appointed = await prisma.notification.count({
      where: { userId: users.memberB.userId, body: { contains: '소그룹장으로 지정됐어요' } },
    });
    expect(dismissed).toBe(1);
    expect(appointed).toBe(1);
  });

  it('모임일은 생성 때 없어도 되고(미정), 수정으로 입력할 수 있다 (SCRUM-189)', async () => {
    const before = await request(server()).get(`/group-meetings/${groupId}`).set(as('admin')).expect(200);
    expect((before.body as GroupMeetingDetail).schedule).toBe('미정');
    const res = await request(server())
      .patch(`/group-meetings/${groupId}`)
      .set(as('leaderA'))
      .send({ schedule: '매주 토요일 오후 6시' })
      .expect(200);
    expect((res.body as GroupMeetingDetail).schedule).toBe('매주 토요일 오후 6시');
    await request(server())
      .patch(`/group-meetings/${groupId}`)
      .set(as('leaderA'))
      .send({ schedule: '' })
      .expect(400);
  });

  it('소그룹장은 0명이 될 수 없고, 없는 회원은 지정할 수 없다', async () => {
    await setLeaders('admin', []).expect(400);
    await request(server())
      .patch(`/group-meetings/${groupId}`)
      .set(as('admin'))
      .send({ leaderIds: ['no-such-user'] })
      .expect(400);
  });
});
