import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { LeaderRoomCandidate, LeaderRoomSummary } from '@onnuri/shared';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

// 테스트 데이터 식별용 접두사/도메인 — 공용 개발 DB를 쓰므로 시드/실데이터와 안 겹치게 붙인다.
const EMAIL_DOMAIN = 'leader-rooms-e2e.test';
const PREFIX = 'leader-rooms-e2e-';

// 전체 리더 방 — 관리자가 만들고 멤버를 직접 고른다. 접근은 "방 멤버이면서 지금도 리더 등급(또는 관리자)".
describe('Leader rooms (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let adminToken: string;
  let teamLeaderToken: string; // 방 멤버 (팀장)
  let cellLeaderToken: string; // 방 멤버 (셀장)
  let otherLeaderToken: string; // 리더지만 방에 안 넣은 사람 (부셀장)
  let plainToken: string; // 리더 등급이 아닌 일반 유저
  let teamLeaderId: string;
  let cellLeaderId: string;
  let otherLeaderId: string;
  let plainId: string;
  let teamLeaderMembershipId: string;
  let roomId: string;

  const cleanup = async () => {
    // 유저를 참조하는 것(방의 메시지, 셀의 만든 사람)을 먼저 지워야 유저를 지울 수 있다.
    await prisma.leaderRoom.deleteMany({
      where: { name: { startsWith: PREFIX } },
    });
    await prisma.cell.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.team.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.user.deleteMany({
      where: { email: { endsWith: `@${EMAIL_DOMAIN}` } },
    });
  };

  const devLogin = async (name: string, role?: 'ADMIN') => {
    const res = await request(app.getHttpServer())
      .post('/auth/login/dev')
      .send({ email: `${name}@${EMAIL_DOMAIN}`, ...(role ? { role } : {}) })
      .expect(201);
    const body = res.body as { accessToken: string; user: { id: string } };
    return { token: body.accessToken, userId: body.user.id };
  };

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
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
    await cleanup();

    const admin = await devLogin('admin', 'ADMIN');
    const teamLeader = await devLogin('team-leader');
    const cellLeader = await devLogin('cell-leader');
    const otherLeader = await devLogin('other-leader');
    const plain = await devLogin('plain');
    adminToken = admin.token;
    teamLeaderToken = teamLeader.token;
    cellLeaderToken = cellLeader.token;
    otherLeaderToken = otherLeader.token;
    plainToken = plain.token;
    teamLeaderId = teamLeader.userId;
    cellLeaderId = cellLeader.userId;
    otherLeaderId = otherLeader.userId;
    plainId = plain.userId;

    const startedAt = new Date('2026-01-01');
    const team = await prisma.team.create({ data: { name: `${PREFIX}팀` } });
    const membership = await prisma.teamMembership.create({
      data: {
        teamId: team.id,
        userId: teamLeaderId,
        role: 'LEADER',
        startedAt,
      },
    });
    teamLeaderMembershipId = membership.id;
    // 일반 유저는 같은 팀의 팀원 — 리더 등급이 아니다.
    await prisma.teamMembership.create({
      data: { teamId: team.id, userId: plainId, role: 'MEMBER', startedAt },
    });

    const cell = await prisma.cell.create({
      data: {
        name: `${PREFIX}셀`,
        startedAt,
        expiresAt: new Date('2099-12-31'),
        createdById: admin.userId,
      },
    });
    await prisma.cellMembership.create({
      data: {
        cellId: cell.id,
        userId: cellLeaderId,
        role: 'LEADER',
        startedAt,
      },
    });
    await prisma.cellMembership.create({
      data: {
        cellId: cell.id,
        userId: otherLeaderId,
        role: 'SUB_LEADER',
        startedAt,
      },
    });
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  describe('방 만들기·관리 (관리자 전용)', () => {
    it('토큰 없이는 401', () =>
      request(server()).get('/leader-rooms').expect(401));

    it('리더 등급이 아닌 유저는 목록도 못 본다 (403)', () =>
      request(server()).get('/leader-rooms').set(auth(plainToken)).expect(403));

    it('리더(관리자 아님)는 방을 만들 수 없다 (403)', () =>
      request(server())
        .post('/leader-rooms')
        .set(auth(teamLeaderToken))
        .send({ name: `${PREFIX}불가`, memberIds: [] })
        .expect(403));

    it('리더 등급이 아닌 사람은 방에 넣을 수 없다 (400)', () =>
      request(server())
        .post('/leader-rooms')
        .set(auth(adminToken))
        .send({ name: `${PREFIX}불가`, memberIds: [teamLeaderId, plainId] })
        .expect(400));

    it('관리자가 방을 만들고 멤버를 고른다', async () => {
      const res = await request(server())
        .post('/leader-rooms')
        .set(auth(adminToken))
        .send({ name: `${PREFIX}방`, memberIds: [teamLeaderId, cellLeaderId] })
        .expect(201);
      const body = res.body as {
        id: string;
        members: { id: string }[];
        canManage: boolean;
      };
      roomId = body.id;
      expect(body.members.map((m) => m.id).sort()).toEqual(
        [cellLeaderId, teamLeaderId].sort(),
      );
      expect(body.canManage).toBe(true);
    });

    it('후보 목록은 관리자만 보고 등급이 붙는다', async () => {
      await request(server())
        .get('/leader-rooms/candidates')
        .set(auth(teamLeaderToken))
        .expect(403);
      const res = await request(server())
        .get('/leader-rooms/candidates')
        .set(auth(adminToken))
        .expect(200);
      const byId = new Map(
        (res.body as LeaderRoomCandidate[]).map((c) => [c.id, c]),
      );
      expect(byId.get(teamLeaderId)?.grade).toBe('teamLeader');
      expect(byId.get(cellLeaderId)?.grade).toBe('cellLeader');
      expect(byId.get(otherLeaderId)?.grade).toBe('viceLeader');
      expect(byId.has(plainId)).toBe(false);
    });

    it('리더(관리자 아님)는 이름 수정·멤버 추가·추방·삭제를 못 한다 (403)', async () => {
      await request(server())
        .patch(`/leader-rooms/${roomId}`)
        .set(auth(teamLeaderToken))
        .send({ name: `${PREFIX}수정` })
        .expect(403);
      await request(server())
        .post(`/leader-rooms/${roomId}/members`)
        .set(auth(teamLeaderToken))
        .send({ userIds: [otherLeaderId] })
        .expect(403);
      await request(server())
        .delete(`/leader-rooms/${roomId}/members/${cellLeaderId}`)
        .set(auth(teamLeaderToken))
        .expect(403);
      await request(server())
        .delete(`/leader-rooms/${roomId}`)
        .set(auth(teamLeaderToken))
        .expect(403);
    });
  });

  describe('방 접근', () => {
    it('방 멤버(팀장·셀장)는 목록에 방이 보이고 대화를 읽고 쓴다', async () => {
      for (const token of [teamLeaderToken, cellLeaderToken]) {
        const list = await request(server())
          .get('/leader-rooms')
          .set(auth(token))
          .expect(200);
        expect(
          (list.body as LeaderRoomSummary[]).some((r) => r.id === roomId),
        ).toBe(true);
        await request(server())
          .get(`/leader-rooms/${roomId}/messages`)
          .set(auth(token))
          .expect(200);
      }
      await request(server())
        .post(`/leader-rooms/${roomId}/messages`)
        .set(auth(teamLeaderToken))
        .send({ content: '팀장 인사' })
        .expect(201);
    });

    it('리더라도 방에 안 넣은 사람은 목록에서 안 보이고 대화는 403이다', async () => {
      const list = await request(server())
        .get('/leader-rooms')
        .set(auth(otherLeaderToken))
        .expect(200);
      expect(
        (list.body as LeaderRoomSummary[]).some((r) => r.id === roomId),
      ).toBe(false);
      await request(server())
        .get(`/leader-rooms/${roomId}/messages`)
        .set(auth(otherLeaderToken))
        .expect(403);
      await request(server())
        .post(`/leader-rooms/${roomId}/messages`)
        .set(auth(otherLeaderToken))
        .send({ content: '몰래 쓰기' })
        .expect(403);
    });

    it('관리자는 방 멤버가 아니어도 모든 방을 읽고 쓴다', async () => {
      await request(server())
        .get(`/leader-rooms/${roomId}/messages`)
        .set(auth(adminToken))
        .expect(200);
      await request(server())
        .post(`/leader-rooms/${roomId}/messages`)
        .set(auth(adminToken))
        .send({ content: '관리자 공지', asNotice: true })
        .expect(201);
    });
  });

  describe('안 읽음 표시', () => {
    it('다른 사람이 쓴 메시지만 세고, 읽음 처리하면 0이 된다', async () => {
      // 셀장의 읽음 위치를 지금으로 잡은 뒤, 팀장이 한 번 더 쓴다
      await request(server())
        .get('/leader-rooms')
        .set(auth(cellLeaderToken))
        .expect(200);
      await request(server())
        .put(`/leader-rooms/${roomId}/read`)
        .set(auth(cellLeaderToken))
        .expect(204);
      await new Promise((resolve) => setTimeout(resolve, 20));
      await request(server())
        .post(`/leader-rooms/${roomId}/messages`)
        .set(auth(teamLeaderToken))
        .send({ content: '새 메시지' })
        .expect(201);

      const list = await request(server())
        .get('/leader-rooms')
        .set(auth(cellLeaderToken));
      const mine = (list.body as LeaderRoomSummary[]).find(
        (r) => r.id === roomId,
      );
      expect(mine?.unreadCount).toBe(1);

      // 내가 쓴 메시지는 안 읽음으로 세지 않는다
      const own = (
        await request(server()).get('/leader-rooms').set(auth(teamLeaderToken))
      ).body as LeaderRoomSummary[];
      expect(
        own.find((r) => r.id === roomId)?.unreadCount,
      ).toBeGreaterThanOrEqual(0);

      await request(server())
        .put(`/leader-rooms/${roomId}/read`)
        .set(auth(cellLeaderToken))
        .expect(204);
      const after = (
        await request(server()).get('/leader-rooms').set(auth(cellLeaderToken))
      ).body as LeaderRoomSummary[];
      expect(after.find((r) => r.id === roomId)?.unreadCount).toBe(0);
    });
  });

  describe('강등', () => {
    it('팀장이 아니게 되면 방 멤버 행이 남아 있어도 방과 목록에 못 들어온다', async () => {
      await prisma.teamMembership.update({
        where: { id: teamLeaderMembershipId },
        data: { endedAt: new Date('2026-06-01') },
      });
      await request(server())
        .get(`/leader-rooms/${roomId}/messages`)
        .set(auth(teamLeaderToken))
        .expect(403);
      await request(server())
        .get('/leader-rooms')
        .set(auth(teamLeaderToken))
        .expect(403);

      // 멤버 목록에서도 빠진다 (알림·언급 대상에서 제외)
      const detail = await request(server())
        .get(`/leader-rooms/${roomId}`)
        .set(auth(adminToken))
        .expect(200);
      expect(
        (detail.body as { members: { id: string }[] }).members.map((m) => m.id),
      ).toEqual([cellLeaderId]);
    });
  });

  describe('관리', () => {
    it('관리자가 이름을 고치고 멤버를 추가·추방하고 방을 지운다', async () => {
      await request(server())
        .patch(`/leader-rooms/${roomId}`)
        .set(auth(adminToken))
        .send({ name: `${PREFIX}수정됨` })
        .expect(200);
      const added = await request(server())
        .post(`/leader-rooms/${roomId}/members`)
        .set(auth(adminToken))
        .send({ userIds: [otherLeaderId] })
        .expect(201);
      expect(
        (added.body as { members: { id: string }[] }).members.some(
          (m) => m.id === otherLeaderId,
        ),
      ).toBe(true);
      await request(server())
        .delete(`/leader-rooms/${roomId}/members/${otherLeaderId}`)
        .set(auth(adminToken))
        .expect(200);

      await request(server())
        .delete(`/leader-rooms/${roomId}`)
        .set(auth(adminToken))
        .expect(204);
      await request(server())
        .get(`/leader-rooms/${roomId}/messages`)
        .set(auth(adminToken))
        .expect(404);
      const list = await request(server())
        .get('/leader-rooms')
        .set(auth(adminToken))
        .expect(200);
      expect(
        (list.body as LeaderRoomSummary[]).some((r) => r.id === roomId),
      ).toBe(false);
    });
  });
});
