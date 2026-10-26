import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const EMAIL_DOMAIN = 'dedupe-create-e2e.test';
const TITLE_PREFIX = 'dedupe-e2e-';

// 응답이 유실돼 앱이 오류로 보고 같은 내용을 다시 보내도 글이 하나만 만들어지는지.
describe('Dedupe create (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;
  let otherToken: string;

  const cleanup = async () => {
    await prisma.post.deleteMany({ where: { title: { startsWith: TITLE_PREFIX } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: `@${EMAIL_DOMAIN}` } } });
  };

  const login = async (name: string) => {
    const res = await request(app.getHttpServer())
      .post('/auth/login/dev')
      .send({ email: `${name}@${EMAIL_DOMAIN}` })
      .expect(201);
    return (res.body as { accessToken: string }).accessToken;
  };

  const visibleUntil = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().slice(0, 10);
  };

  const createPrayer = (auth: string, title: string, content = '내용') =>
    request(app.getHttpServer())
      .post('/posts/prayers')
      .set('Authorization', `Bearer ${auth}`)
      .send({
        title,
        content,
        category: 'OTHER',
        isAnonymous: false,
        visibleUntil: visibleUntil(),
      });

  const count = (title: string) =>
    prisma.post.count({ where: { title, deletedAt: null } });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    await cleanup();
    token = await login('me');
    otherToken = await login('other');
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('같은 내용을 다시 보내면 글이 하나만 만들어지고 같은 응답을 돌려준다', async () => {
    const title = `${TITLE_PREFIX}retry`;
    const first = await createPrayer(token, title).expect(201);
    const second = await createPrayer(token, title).expect(201);
    expect((second.body as { id: string }).id).toBe((first.body as { id: string }).id);
    expect(await count(title)).toBe(1);
  });

  it('동시에 두 번 들어와도 하나만 만들어진다', async () => {
    const title = `${TITLE_PREFIX}parallel`;
    await Promise.all([createPrayer(token, title), createPrayer(token, title)]);
    expect(await count(title)).toBe(1);
  });

  it('내용이 다르면 각각 만들어진다', async () => {
    const title = `${TITLE_PREFIX}different`;
    await createPrayer(token, title, '하나').expect(201);
    await createPrayer(token, title, '둘').expect(201);
    expect(await count(title)).toBe(2);
  });

  it('다른 사용자의 같은 내용은 막지 않는다', async () => {
    const title = `${TITLE_PREFIX}users`;
    await createPrayer(token, title).expect(201);
    await createPrayer(otherToken, title).expect(201);
    expect(await count(title)).toBe(2);
  });

  it('실패한 요청은 기억하지 않아 고쳐서 다시 보내면 만들어진다', async () => {
    const title = `${TITLE_PREFIX}failed`;
    await request(app.getHttpServer())
      .post('/posts/prayers')
      .set('Authorization', `Bearer ${token}`)
      .send({ title, content: '내용' })
      .expect(400);
    await createPrayer(token, title).expect(201);
    expect(await count(title)).toBe(1);
  });
});
