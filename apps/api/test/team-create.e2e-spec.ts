import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { DEV_LOGIN_HEADER } from './dev-login';

// 팀 생성 (SCRUM-210): 필수는 팀 이름·팀장·아이콘이고, 배경사진·소개·권한은 비워도 만들어진다.
describe('Team create (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const DOMAIN = 'team-create-e2e.test';
  const TEAM_PREFIX = 'e2e팀생성';
  let adminToken = '';
  let leaderId = '';

  const server = () => app.getHttpServer();
  const create = (body: Record<string, unknown>) =>
    request(server())
      .post('/teams')
      .set({ Authorization: `Bearer ${adminToken}` })
      .send(body);

  const cleanup = async () => {
    await prisma.team.deleteMany({
      where: { name: { startsWith: TEAM_PREFIX } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: `@${DOMAIN}` } },
    });
  };

  const login = async (who: string, role: 'ADMIN' | 'MEMBER') => {
    const res = await request(server())
      .post('/auth/login/dev')
      .set(DEV_LOGIN_HEADER)
      .send({ email: `${who}@${DOMAIN}`, role })
      .expect(201);
    return res.body as { accessToken: string; user: { id: string } };
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
    adminToken = (await login('admin', 'ADMIN')).accessToken;
    leaderId = (await login('leader', 'MEMBER')).user.id;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('이름·팀장·아이콘만으로 만들 수 있고 나머지는 비어 있다', async () => {
    const res = await create({
      name: `${TEAM_PREFIX}1`,
      leaderIds: [leaderId],
      iconName: 'palette',
    }).expect(201);
    const { id } = res.body as { id: string };
    const team = await prisma.team.findUnique({ where: { id } });
    expect(team).toMatchObject({
      tagline: null,
      description: null,
      coverImageUrl: null,
      canUploadBulletin: false,
      canManageBanner: false,
    });
  });

  it('소개를 null로 보내도 된다 (앱이 빈 칸을 null로 보냄)', () =>
    create({
      name: `${TEAM_PREFIX}2`,
      leaderIds: [leaderId],
      iconName: 'pray',
      tagline: null,
      description: null,
      coverImageUrl: null,
    }).expect(201));

  it('아이콘이 없으면 400', () =>
    create({ name: `${TEAM_PREFIX}3`, leaderIds: [leaderId] }).expect(400));

  it('팀장이 없으면 400', () =>
    create({ name: `${TEAM_PREFIX}4`, leaderIds: [], iconName: 'note' }).expect(
      400,
    ));
});
