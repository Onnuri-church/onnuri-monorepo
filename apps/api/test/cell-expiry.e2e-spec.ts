import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { CellSummary } from '@onnuri/shared';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { kstToday } from '../src/common/utils/date';
import { CellExpiryService } from '../src/modules/cells/cell-expiry.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';

// 테스트 데이터 식별용 접두사/도메인 — 공용 개발 DB를 쓰므로 시드/실데이터와 안 겹치게 붙인다.
const EMAIL_DOMAIN = 'cell-expiry-e2e.test';
const FIXTURE_PREFIX = 'cell-expiry-e2e-';
const DAY_MS = 24 * 60 * 60 * 1000;

interface MeBody {
  cell: { id: string; name: string } | null;
  canUseLeaderRooms: boolean;
}

// 셀 활동기간이 끝나면(종료일 다음 날 한국 시간 0시) 소속이 종료돼 무소속이 되고,
// 셀장 권한도 같이 끝난다 (2026-10-27 확정).
describe('Cell expiry (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let expiry: CellExpiryService;

  const today = kstToday();
  const yesterday = new Date(today.getTime() - DAY_MS);

  let endedCellId: string;
  let lastDayCellId: string;
  let activeCellId: string;
  let endedLeader: { token: string; userId: string };
  let lastDayMember: { token: string; userId: string };
  let movedMember: { token: string; userId: string };

  const cleanup = async () => {
    // 셀을 지우면 멤버십이 cascade로 지워진다.
    await prisma.cell.deleteMany({
      where: { name: { startsWith: FIXTURE_PREFIX } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: `@${EMAIL_DOMAIN}` } },
    });
  };

  const devLogin = async (name: string, role?: 'CELL_LEADER') => {
    const res = await request(app.getHttpServer())
      .post('/auth/login/dev')
      .send({ email: `${name}@${EMAIL_DOMAIN}`, ...(role ? { role } : {}) })
      .expect(201);
    const body = res.body as { accessToken: string; user: { id: string } };
    return { token: body.accessToken, userId: body.user.id };
  };

  const me = async (token: string) => {
    const res = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return res.body as MeBody;
  };

  const createCell = async (
    name: string,
    expiresAt: Date,
    createdById: string,
  ) =>
    (
      await prisma.cell.create({
        data: {
          name: `${FIXTURE_PREFIX}${name}`,
          startedAt: new Date('2026-01-01'),
          expiresAt,
          createdById,
        },
      })
    ).id;

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
    expiry = app.get(CellExpiryService);
    await cleanup();

    endedLeader = await devLogin('ended-leader');
    lastDayMember = await devLogin('last-day-member');
    movedMember = await devLogin('moved-member');

    endedCellId = await createCell('어제끝난셀', yesterday, endedLeader.userId);
    lastDayCellId = await createCell('오늘끝나는셀', today, endedLeader.userId);
    activeCellId = await createCell(
      '활동셀',
      new Date('2099-12-31'),
      endedLeader.userId,
    );

    await prisma.cellMembership.createMany({
      data: [
        {
          cellId: endedCellId,
          userId: endedLeader.userId,
          role: 'LEADER',
          startedAt: new Date('2026-01-01'),
        },
        {
          cellId: lastDayCellId,
          userId: lastDayMember.userId,
          role: 'MEMBER',
          startedAt: new Date('2026-01-01'),
        },
        {
          cellId: activeCellId,
          userId: movedMember.userId,
          role: 'MEMBER',
          startedAt: new Date('2026-01-01'),
        },
      ],
    });
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('종료 작업 전에도 끝난 셀은 내 셀·셀 목록에서 빠지고, 종료일 당일 셀은 남는다', async () => {
    expect((await me(endedLeader.token)).cell).toBeNull();
    expect((await me(lastDayMember.token)).cell?.id).toBe(lastDayCellId);

    const res = await request(app.getHttpServer()).get('/cells').expect(200);
    const ids = (res.body as CellSummary[]).map((cell) => cell.id);
    expect(ids).toContain(lastDayCellId);
    expect(ids).not.toContain(endedCellId);
  });

  it('종료 작업은 끝난 셀 소속에 셀 종료일을 찍고, 활동 중인 셀은 건드리지 않는다', async () => {
    await expiry.endExpiredMemberships();

    const ended = await prisma.cellMembership.findFirst({
      where: { cellId: endedCellId, userId: endedLeader.userId },
      select: { endedAt: true },
    });
    expect(ended?.endedAt?.toISOString().slice(0, 10)).toBe(
      yesterday.toISOString().slice(0, 10),
    );

    const lastDay = await prisma.cellMembership.findFirst({
      where: { cellId: lastDayCellId, userId: lastDayMember.userId },
      select: { endedAt: true },
    });
    expect(lastDay?.endedAt).toBeNull();
  });

  it('셀이 끝나면 셀장 권한도 끝난다 — 노트 열람 403, 리더 방 진입 불가', async () => {
    await expiry.endExpiredMemberships();

    await request(app.getHttpServer())
      .get(`/cells/${endedCellId}/follower-notes`)
      .set('Authorization', `Bearer ${endedLeader.token}`)
      .expect(403);
    expect((await me(endedLeader.token)).canUseLeaderRooms).toBe(false);
  });

  it('개발용 셀장 로그인은 다른 셀 소속을 끝내고 개발셀로 옮긴다 (이중 소속 없음)', async () => {
    const relogin = await devLogin('moved-member', 'CELL_LEADER');

    const active = await prisma.cellMembership.findMany({
      where: { userId: movedMember.userId, endedAt: null },
      select: { cellId: true },
    });
    expect(active).toHaveLength(1);
    expect(active[0].cellId).not.toBe(activeCellId);
    expect((await me(relogin.token)).cell?.id).toBe(active[0].cellId);
  });
});
