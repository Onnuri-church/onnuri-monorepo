import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { TeamFollowerNoteInfo } from '@onnuri/shared';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { DEV_LOGIN_HEADER } from './dev-login';

// 공용 개발 DB라 시드·실데이터와 안 겹치게 접두사/도메인을 붙이고 정리 때 지운다.
const EMAIL_DOMAIN = 'team-notes-e2e.test';
const TEAM_NAME = 'team-notes-e2e-팀';

// 팀 팔로워 노트 (SCRUM-180): 그 팀 현재 팀장 누구나 쓰고·고치고·지운다, 관리자는 열람·댓글만,
// 팀원·다른 팀 팀장은 못 본다. 동시 수정은 updatedAt으로 막는다(409).
describe('Team follower notes (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let teamId: string;
  let adminToken: string;
  let leaderAToken: string;
  let leaderBToken: string;
  let memberToken: string;

  const cleanup = async () => {
    // 팀을 지우면 노트 → 댓글, 멤버십까지 cascade로 지워진다.
    await prisma.team.deleteMany({ where: { name: TEAM_NAME } });
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

  const path = () => `/teams/${teamId}/follower-notes`;
  const list = async (token: string) => {
    const res = await request(app.getHttpServer())
      .get(path())
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return res.body as TeamFollowerNoteInfo[];
  };
  const create = (token: string, content: string) =>
    request(app.getHttpServer())
      .post(path())
      .set('Authorization', `Bearer ${token}`)
      .send({ content });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    await cleanup();

    const admin = await devLogin('admin', 'ADMIN');
    const leaderA = await devLogin('leader-a');
    const leaderB = await devLogin('leader-b');
    const member = await devLogin('member');
    adminToken = admin.token;
    leaderAToken = leaderA.token;
    leaderBToken = leaderB.token;
    memberToken = member.token;

    const team = await prisma.team.create({ data: { name: TEAM_NAME } });
    teamId = team.id;
    const startedAt = new Date('2026-01-01');
    await prisma.teamMembership.createMany({
      data: [
        { teamId, userId: leaderA.userId, role: 'LEADER', startedAt },
        { teamId, userId: leaderB.userId, role: 'LEADER', startedAt },
        { teamId, userId: member.userId, role: 'MEMBER', startedAt },
      ],
    });
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('팀원은 볼 수도 쓸 수도 없다 (403)', async () => {
    await request(app.getHttpServer())
      .get(path())
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403);
    await create(memberToken, '팀원이 쓴 노트').expect(403);
  });

  it('관리자는 볼 수 있지만 노트는 못 쓴다', async () => {
    await list(adminToken);
    await create(adminToken, '관리자 노트').expect(403);
  });

  it('팀장이 쓰면 다른 팀장도 보고, 고치면 "수정한 사람"이 남는다', async () => {
    await create(leaderAToken, '처음 쓴 내용').expect(201);
    const [note] = await list(leaderBToken);
    expect(note.content).toBe('처음 쓴 내용');
    expect(note.editedByName).toBeNull();

    const res = await request(app.getHttpServer())
      .patch(`${path()}/${note.id}`)
      .set('Authorization', `Bearer ${leaderBToken}`)
      .send({ content: 'B가 고친 내용', updatedAt: note.updatedAt })
      .expect(200);
    const updated = (res.body as TeamFollowerNoteInfo[]).find((n) => n.id === note.id)!;
    expect(updated.content).toBe('B가 고친 내용');
    expect(updated.editedByName).not.toBeNull();
  });

  it('그 사이 다른 팀장이 고쳤으면 예전 updatedAt으로 저장하면 409', async () => {
    const [note] = await list(leaderAToken);
    const stale = note.updatedAt;
    await request(app.getHttpServer())
      .patch(`${path()}/${note.id}`)
      .set('Authorization', `Bearer ${leaderBToken}`)
      .send({ content: '먼저 저장', updatedAt: stale })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`${path()}/${note.id}`)
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({ content: '나중 저장', updatedAt: stale })
      .expect(409);
    const [after] = await list(leaderAToken);
    expect(after.content).toBe('먼저 저장');
  });

  it('본문이 5000자를 넘으면 400', () => create(leaderAToken, '가'.repeat(5001)).expect(400));

  it('관리자 댓글 + 팀장 답글, 대댓글에 또 답글은 400', async () => {
    const [note] = await list(leaderAToken);
    const commentsPath = `${path()}/${note.id}/comments`;
    const res = await request(app.getHttpServer())
      .post(commentsPath)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ content: '목사님 댓글' })
      .expect(201);
    const pastor = (res.body as TeamFollowerNoteInfo[])[0].comments.find(
      (c) => c.content === '목사님 댓글',
    )!;
    expect(pastor.isPastor).toBe(true);

    const replyRes = await request(app.getHttpServer())
      .post(commentsPath)
      .set('Authorization', `Bearer ${leaderBToken}`)
      .send({ content: '팀장 답글', parentId: pastor.id })
      .expect(201);
    const reply = (replyRes.body as TeamFollowerNoteInfo[])[0].comments.find(
      (c) => c.content === '팀장 답글',
    )!;
    await request(app.getHttpServer())
      .post(commentsPath)
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({ content: '3단계', parentId: reply.id })
      .expect(400);
  });

  it('다른 팀장도 노트를 지울 수 있다', async () => {
    const [note] = await list(leaderAToken);
    await request(app.getHttpServer())
      .delete(`${path()}/${note.id}`)
      .set('Authorization', `Bearer ${leaderBToken}`)
      .expect(200);
    expect((await list(leaderAToken)).find((n) => n.id === note.id)).toBeUndefined();
  });
});
