import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';

// 스토어 등록용 공개 페이지 (SCRUM-194): 로그인 없이 HTML로 열린다.
describe('Public pages (e2e)', () => {
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

  it.each([
    ['/privacy', '개인정보처리방침'],
    ['/terms', '서비스 이용약관'],
    ['/account-deletion', '계정 삭제 안내'],
  ])('%s 는 로그인 없이 HTML로 열린다', async (path, heading) => {
    const res = await request(app.getHttpServer()).get(path).expect(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain(heading);
    expect(res.text).not.toContain('<script');
  });
});
