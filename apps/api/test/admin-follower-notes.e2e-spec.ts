import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { AdminFollowerNoteOverview } from '@onnuri/shared';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { DEV_LOGIN_HEADER } from './dev-login';

const EMAIL_DOMAIN = 'admin-notes-e2e.test';
const PREFIX = 'admin-notes-e2e-';
const MEETING_DATE = new Date('2099-02-01');

// 팔로워 노트 관리 (SCRUM-181): 관리자 목록의 "새 노트" 수는 그 관리자가 게시판을 마지막으로 연 뒤
// 다른 사람이 쓴 노트 수다 — 게시판을 열면 0으로 돌아간다. 관리자만 볼 수 있다.
describe('Admin follower notes (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let leaderToken: string;
  let leaderId: string;
  let cellId: string;
  let teamId: string;

  const cleanup = async () => {
    await prisma.cell.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.team.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.worshipService.deleteMany({ where: { date: MEETING_DATE } });
    await prisma.user.deleteMany({
      where: { email: { endsWith: `@${EMAIL_DOMAIN}` } },
    });
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

  const overview = async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/follower-notes')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const body = res.body as AdminFollowerNoteOverview;
    return {
      cell: body.cells.find((c) => c.id === cellId)!,
      team: body.teams.find((t) => t.id === teamId)!,
    };
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

    const admin = await devLogin('admin', 'ADMIN');
    const leader = await devLogin('leader');
    adminToken = admin.token;
    leaderToken = leader.token;
    leaderId = leader.userId;

    const startedAt = new Date('2026-01-01');
    const cell = await prisma.cell.create({
      data: {
        name: `${PREFIX}셀`,
        startedAt,
        expiresAt: new Date('2099-12-31'),
        createdById: admin.userId,
      },
    });
    cellId = cell.id;
    const team = await prisma.team.create({ data: { name: `${PREFIX}팀` } });
    teamId = team.id;
    await prisma.cellMembership.create({
      data: { cellId, userId: leaderId, role: 'LEADER', startedAt },
    });
    await prisma.teamMembership.create({
      data: { teamId, userId: leaderId, role: 'LEADER', startedAt },
    });
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('관리자가 아니면 403', () =>
    request(app.getHttpServer())
      .get('/admin/follower-notes')
      .set('Authorization', `Bearer ${leaderToken}`)
      .expect(403));

  it('노트가 없으면 0개', async () => {
    const { cell, team } = await overview();
    expect(cell.totalCount).toBe(0);
    expect(cell.newCount).toBe(0);
    expect(team.totalCount).toBe(0);
  });

  it('팀장이 쓰면 새 노트로 잡히고, 관리자가 게시판을 열면 0이 된다', async () => {
    const service = await prisma.worshipService.create({
      data: { date: MEETING_DATE, name: '주일예배' },
    });
    const meeting = await prisma.cellMeeting.create({
      data: { cellId, serviceId: service.id, createdById: leaderId },
    });
    await prisma.followerNote.create({
      data: { meetingId: meeting.id, authorId: leaderId, answer1: '나눔' },
    });
    await request(app.getHttpServer())
      .post(`/teams/${teamId}/follower-notes`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ content: '팀 노트' })
      .expect(201);

    let { cell, team } = await overview();
    expect(cell.newCount).toBe(1);
    expect(team.newCount).toBe(1);
    expect(team.lastNoteAt).not.toBeNull();

    await request(app.getHttpServer())
      .get(`/cells/${cellId}/follower-notes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    ({ cell, team } = await overview());
    expect(cell.newCount).toBe(0);
    expect(cell.totalCount).toBe(1);
    expect(team.newCount).toBe(1);

    await request(app.getHttpServer())
      .get(`/teams/${teamId}/follower-notes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    ({ team } = await overview());
    expect(team.newCount).toBe(0);
  });
});
