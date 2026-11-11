import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { AppVersionPolicy } from '@onnuri/shared';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';

// 앱 버전 정책 (SCRUM-193): 로그인 없이 열리고, 환경변수의 최소 버전·스토어 주소를 돌려준다.
describe('App version policy (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('토큰 없이 정책을 돌려준다', async () => {
    const res = await request(app.getHttpServer())
      .get('/app/version')
      .expect(200);
    const body = res.body as AppVersionPolicy;
    expect(body).toHaveProperty('minVersion');
    expect(body.storeUrl).toHaveProperty('android');
    expect(body.storeUrl).toHaveProperty('ios');
    // 개발 환경 기본값은 강제하지 않음
    expect(body.minVersion ?? null).toBe(process.env.APP_MIN_VERSION || null);
  });
});
