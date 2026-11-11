import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { DEV_LOGIN_HEADER } from './dev-login';

const EMAIL_DOMAIN = 'uploads-e2e.test';

// 업로드 내용 검사 (SCRUM-173): 형식 표기만 바꾼 파일은 저장소에 닿기 전에 400으로 막힌다.
// 정상 파일은 실제 저장소에 올라가므로 여기서는 거절 경로만 본다 (통과 규칙은 file-signature.spec).
describe('Uploads content check (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;

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
    const res = await request(app.getHttpServer())
      .post('/auth/login/dev')
      .set(DEV_LOGIN_HEADER)
      .send({ email: `uploader@${EMAIL_DOMAIN}` })
      .expect(201);
    token = (res.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { endsWith: `@${EMAIL_DOMAIN}` } },
    });
    await app.close();
  });

  const upload = (content: Buffer, filename: string, contentType: string) =>
    request(app.getHttpServer())
      .post('/uploads')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', content, { filename, contentType });

  it('사진이라고 보낸 HTML은 400', async () => {
    const res = await upload(
      Buffer.from('<!doctype html><script>alert(1)</script>'),
      'photo.jpg',
      'image/jpeg',
    ).expect(400);
    expect((res.body as { message: string }).message).toContain(
      '파일 내용이 형식과 맞지 않아요',
    );
  });

  it('PDF라고 보낸 실행 파일은 400', () =>
    upload(
      Buffer.concat([Buffer.from('MZ'), Buffer.alloc(64)]),
      'doc.pdf',
      'application/pdf',
    ).expect(400));

  it('동영상이라고 보낸 사진은 400', () =>
    upload(
      Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)]),
      'clip.mp4',
      'video/mp4',
    ).expect(400));
});
