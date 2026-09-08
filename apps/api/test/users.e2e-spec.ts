import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

// 테스트 데이터 식별용 접두사/도메인 — 시작/종료 시 이 값들로 만든 행을 정리한다.
// 개발용 로그인은 test/setup-e2e.ts가 AUTH_DEV_LOGIN을 켜준다.
const EMAIL_DOMAIN = 'users-e2e.test';
const USER_EMAIL = `profile@${EMAIL_DOMAIN}`;
const FIXTURE_PREFIX = 'users-e2e-';

interface CellSummaryBody {
  id: string;
  name: string;
}

interface UserBody {
  id: string;
  birthDate: string | null;
  gender: string | null;
  phone: string | null;
  profileCompleted: boolean;
}

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let userId: string;
  let accessToken: string;
  let cellAId: string;
  let cellBId: string;
  let teamAId: string;

  // 픽스처 셀의 createdById가 테스트 유저를 참조하므로(관계가 restrict) 셀부터 지운다.
  const cleanup = async () => {
    await prisma.cell.deleteMany({
      where: { name: { startsWith: FIXTURE_PREFIX } },
    });
    await prisma.team.deleteMany({
      where: { name: { startsWith: FIXTURE_PREFIX } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: `@${EMAIL_DOMAIN}` } },
    });
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

    const login = await request(app.getHttpServer())
      .post('/auth/login/dev')
      .send({ email: USER_EMAIL })
      .expect(201);
    const loginBody = login.body as {
      accessToken: string;
      user: { id: string };
    };
    accessToken = loginBody.accessToken;
    userId = loginBody.user.id;

    // 소속 선택지 픽스처. 만료된 셀은 목록에서 빠져야 하므로 하나 섞어둔다.
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const past = new Date('2020-01-01');
    const cellA = await prisma.cell.create({
      data: {
        name: `${FIXTURE_PREFIX}셀A`,
        startedAt: past,
        expiresAt: future,
        createdById: userId,
      },
    });
    const cellB = await prisma.cell.create({
      data: {
        name: `${FIXTURE_PREFIX}셀B`,
        startedAt: past,
        expiresAt: future,
        createdById: userId,
      },
    });
    await prisma.cell.create({
      data: {
        name: `${FIXTURE_PREFIX}만료셀`,
        startedAt: past,
        expiresAt: past,
        createdById: userId,
      },
    });
    const teamA = await prisma.team.create({
      data: { name: `${FIXTURE_PREFIX}팀A` },
    });
    cellAId = cellA.id;
    cellBId = cellB.id;
    teamAId = teamA.id;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  const validBody = () => ({
    birthDate: '2000-03-10',
    gender: 'MALE',
    phone: '01012345678',
    cellId: cellAId,
    teamId: teamAId,
  });

  describe('소속 선택지 목록', () => {
    it('GET /cells는 토큰 없이 401', () =>
      request(app.getHttpServer()).get('/cells').expect(401));

    it('GET /teams는 토큰 없이 401', () =>
      request(app.getHttpServer()).get('/teams').expect(401));

    it('GET /cells는 삭제·만료되지 않은 셀만 준다', async () => {
      const res = await request(app.getHttpServer())
        .get('/cells')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const names = (res.body as CellSummaryBody[]).map((cell) => cell.name);
      expect(names).toContain(`${FIXTURE_PREFIX}셀A`);
      expect(names).not.toContain(`${FIXTURE_PREFIX}만료셀`);
    });

    it('GET /teams는 팀 목록을 준다', async () => {
      const res = await request(app.getHttpServer())
        .get('/teams')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const names = (res.body as CellSummaryBody[]).map((team) => team.name);
      expect(names).toContain(`${FIXTURE_PREFIX}팀A`);
    });
  });

  describe('프로필 등록 (PATCH /users/me)', () => {
    it('등록 전에는 profileCompleted가 false다 (온보딩 분기 기준)', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect((res.body as UserBody).profileCompleted).toBe(false);
    });

    it('토큰 없이 401', () =>
      request(app.getHttpServer())
        .patch('/users/me')
        .send(validBody())
        .expect(401));

    it('전화번호 형식이 틀리면 400', () =>
      request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...validBody(), phone: '012-3456-7890' })
        .expect(400));

    it('존재하지 않는 날짜(2월 31일)면 400', () =>
      request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...validBody(), birthDate: '2000-02-31' })
        .expect(400));

    it('cellId 필드가 아예 빠지면 400 (없음은 null로 보내는 계약)', () =>
      request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...validBody(), cellId: undefined })
        .expect(400));

    it('존재하지 않는 셀이면 400', () =>
      request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...validBody(), cellId: 'no-such-cell' })
        .expect(400));

    it('프로필을 저장하고 셀/팀 멤버십을 만든다', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(validBody())
        .expect(200);

      const body = res.body as UserBody;
      expect(body.birthDate).toBe('2000-03-10');
      expect(body.gender).toBe('MALE');
      expect(body.phone).toBe('01012345678');
      expect(body.profileCompleted).toBe(true);

      const cellMemberships = await prisma.cellMembership.findMany({
        where: { userId },
      });
      expect(cellMemberships).toHaveLength(1);
      expect(cellMemberships[0]).toMatchObject({
        cellId: cellAId,
        endedAt: null,
      });

      const teamMemberships = await prisma.teamMembership.findMany({
        where: { userId },
      });
      expect(teamMemberships).toHaveLength(1);
      expect(teamMemberships[0]).toMatchObject({
        teamId: teamAId,
        endedAt: null,
      });
    });

    it('같은 소속으로 다시 저장하면 멤버십 행이 늘지 않는다', async () => {
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(validBody())
        .expect(200);

      const cellMemberships = await prisma.cellMembership.findMany({
        where: { userId },
      });
      expect(cellMemberships).toHaveLength(1);
    });

    it('셀을 바꾸면 이전 멤버십은 종료 처리되고 새 행이 생긴다 (이력 보존)', async () => {
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...validBody(), cellId: cellBId })
        .expect(200);

      const memberships = await prisma.cellMembership.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });
      expect(memberships).toHaveLength(2);
      expect(memberships[0].cellId).toBe(cellAId);
      expect(memberships[0].endedAt).not.toBeNull();
      expect(memberships[1]).toMatchObject({ cellId: cellBId, endedAt: null });
    });

    it('없음(null)으로 바꾸면 현재 멤버십만 종료된다', async () => {
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...validBody(), cellId: null, teamId: null })
        .expect(200);

      const activeCell = await prisma.cellMembership.findFirst({
        where: { userId, endedAt: null },
      });
      const activeTeam = await prisma.teamMembership.findFirst({
        where: { userId, endedAt: null },
      });
      expect(activeCell).toBeNull();
      expect(activeTeam).toBeNull();
    });
  });
});
