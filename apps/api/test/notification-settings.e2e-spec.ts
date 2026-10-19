import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { NotificationSettings } from '@onnuri/shared';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const EMAIL_DOMAIN = 'notification-settings-e2e.test';

// 알림 토글 — 설정 저장/조회, 꺼둔 종류는 푸시에서 빠지고 알림센터에는 그대로 쌓이는지.
describe('Notification settings (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let notifications: NotificationsService;
  let token: string;
  let userId: string;
  const sentBodies: string[] = [];
  const realFetch = global.fetch;

  const cleanup = () =>
    prisma.user.deleteMany({ where: { email: { endsWith: `@${EMAIL_DOMAIN}` } } });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    notifications = app.get(NotificationsService);
    await cleanup();

    const res = await request(app.getHttpServer())
      .post('/auth/login/dev')
      .send({ email: `me@${EMAIL_DOMAIN}` })
      .expect(201);
    const body = res.body as { accessToken: string; user: { id: string } };
    token = body.accessToken;
    userId = body.user.id;
    await prisma.pushToken.create({
      data: { userId, token: 'ExponentPushToken[notification-settings-e2e]' },
    });

    // Expo 푸시 서버 대신 보낸 본문만 기록한다.
    global.fetch = jest.fn((_url: unknown, init?: { body?: string }) => {
      const messages = JSON.parse(init?.body ?? '[]') as { body: string }[];
      sentBodies.push(...messages.map((message) => message.body));
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: messages.map(() => ({ status: 'ok' })) }),
      });
    }) as unknown as typeof fetch;
  });

  afterAll(async () => {
    global.fetch = realFetch;
    await cleanup();
    await app.close();
  });

  const patch = (body: object) =>
    request(app.getHttpServer())
      .patch('/users/me/notification-settings')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  it('기본값은 전부 켜짐', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/me/notification-settings')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(Object.values(res.body as NotificationSettings)).toEqual(
      Array(8).fill(true),
    );
  });

  it('보낸 필드만 저장된다', async () => {
    const res = await patch({ notice: false, chatMessage: false }).expect(200);
    const settings = res.body as NotificationSettings;
    expect(settings.notice).toBe(false);
    expect(settings.chatMessage).toBe(false);
    expect(settings.bulletin).toBe(true);
  });

  it('꺼둔 종류는 푸시에서 빠지고, 켠 종류·알림센터는 그대로', async () => {
    sentBodies.length = 0;
    await notifications.notify([userId], { type: 'NOTICE', title: '공지', body: 'n-off' });
    await notifications.notify([userId], { type: 'BULLETIN', title: '주보', body: 'b-on' });
    await notifications.pushOnly([userId], {
      type: 'CHAT',
      title: '단톡방',
      body: 'chat-off',
      pref: 'notifyChat',
    });
    // 멘션처럼 pref 없는 CHAT은 항상 전달
    await notifications.pushOnly([userId], { type: 'CHAT', title: '단톡방', body: 'mention' });

    expect(sentBodies).toEqual(['b-on', 'mention']);
    const rows = await prisma.notification.findMany({ where: { userId } });
    expect(rows.map((row) => row.body)).toEqual(
      expect.arrayContaining(['n-off', 'b-on']),
    );
  });
});
