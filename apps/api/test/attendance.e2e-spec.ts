import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ATTENDANCE_QR_CODE } from '@onnuri/shared';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const EMAIL_DOMAIN = 'attendance-e2e.test';

// QR 출석은 "오늘 날짜의 회차"에 기록하는 구조라, 공용 DB에서 오늘 회차를 픽스처로
// 만들면 실제(주일) 회차와 충돌할 수 있다 — 여기서는 날짜와 무관하게 성립하는
// 인증(401)·코드 검증(400)만 커버하고, 시간창·성공·중복은 임시 회차 + curl로 검증했다
// (PR #79 작업 내용 참고).
describe('Attendance (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let accessToken: string;

  const cleanup = async () => {
    await prisma.user.deleteMany({
      where: { email: { endsWith: `@${EMAIL_DOMAIN}` } },
    });
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    await cleanup();

    const login = await request(app.getHttpServer())
      .post('/auth/login/dev')
      .send({ email: `member@${EMAIL_DOMAIN}` })
      .expect(201);
    accessToken = (login.body as { accessToken: string }).accessToken;
  }, 30_000);

  afterAll(async () => {
    await cleanup();
    await app.close();
  }, 30_000);

  it('토큰 없이 출석하면 401', () =>
    request(app.getHttpServer())
      .post('/attendance/check-in')
      .send({ code: ATTENDANCE_QR_CODE })
      .expect(401));

  it('출석 QR이 아닌 코드는 400', () =>
    request(app.getHttpServer())
      .post('/attendance/check-in')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code: 'not-the-attendance-qr' })
      .expect(400));

  it('code 없이 보내면 400 (검증)', () =>
    request(app.getHttpServer())
      .post('/attendance/check-in')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(400));
});
