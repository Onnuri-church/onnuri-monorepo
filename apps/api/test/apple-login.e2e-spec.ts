import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';

// Apple 로그인 (SCRUM-200): 토큰이 없으면 400, 애플이 서명하지 않은 토큰은 401.
// 실제 애플 토큰 검증은 애플 개발자 계정·iOS 기기가 있어야 해서 여기서는 거절 경로만 본다.
describe('Apple login (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('토큰이 없으면 400', () =>
    request(app.getHttpServer())
      .post('/auth/login/apple')
      .send({})
      .expect(400));

  it('위조한 토큰은 401', () =>
    request(app.getHttpServer())
      .post('/auth/login/apple')
      .send({ token: 'not.a.jwt', name: '홍길동' })
      .expect(401));
});
