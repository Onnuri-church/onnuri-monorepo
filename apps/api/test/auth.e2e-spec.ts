import {
  Controller,
  Get,
  INestApplication,
  UnauthorizedException,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { CurrentUser } from '../src/common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../src/common/guards/optional-jwt-auth.guard';
import { GoogleTokenVerifier } from '../src/modules/auth/social/google-token.verifier';
import { KakaoTokenVerifier } from '../src/modules/auth/social/kakao-token.verifier';
import type { SocialProfile } from '../src/modules/auth/social/social-profile';
import type { JwtPayload } from '../src/modules/auth/strategies/jwt.strategy';
import { PrismaService } from '../src/modules/prisma/prisma.service';

// 테스트 데이터 식별용 도메인 — 시작/종료 시 이 도메인의 유저를 정리한다.
const EMAIL_DOMAIN = 'auth-e2e.test';
const MINSU_EMAIL = `minsu@${EMAIL_DOMAIN}`;

// supertest의 res.body는 any라 응답 모양을 명시해서 읽는다.
interface TokenPairBody {
  accessToken: string;
  refreshToken: string;
}

interface LoginBody extends TokenPairBody {
  isNewUser: boolean;
  user: { id: string; name: string };
}

// 실제 카카오/구글 호출 대신 토큰 문자열 → 프로필, 인가 코드 → 토큰 매핑으로 동작하는 가짜 검증기.
class FakeVerifier {
  constructor(
    private readonly profiles: Record<string, SocialProfile>,
    private readonly codes: Record<string, string> = {},
  ) {}

  verify(token: string): Promise<SocialProfile> {
    const profile = this.profiles[token];
    if (!profile) {
      return Promise.reject(
        new UnauthorizedException('토큰 검증에 실패했습니다.'),
      );
    }
    return Promise.resolve(profile);
  }

  exchangeCode(code: string): Promise<string> {
    const token = this.codes[code];
    if (!token) {
      return Promise.reject(
        new UnauthorizedException('카카오 인가 코드 교환에 실패했습니다.'),
      );
    }
    return Promise.resolve(token);
  }
}

// OptionalJwtAuthGuard는 아직 쓰는 실제 엔드포인트가 없어 테스트 전용 컨트롤러로 검증한다.
@Controller('auth-e2e-optional')
class OptionalAuthTestController {
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  whoami(@CurrentUser() user: JwtPayload | undefined) {
    return { userId: user?.sub ?? null };
  }
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // 임시 이메일(@social.invalid)로 가입된 테스트 유저는 이메일 도메인으로 못 찾으므로
  // 테스트가 쓰는 providerUid로도 지운다.
  const TEST_UIDS = ['kakao-uid-1', 'kakao-uid-2', 'google-uid-1'];
  const cleanup = () =>
    prisma.user.deleteMany({
      where: {
        OR: [
          { email: { endsWith: `@${EMAIL_DOMAIN}` } },
          { socialAccounts: { some: { providerUid: { in: TEST_UIDS } } } },
        ],
      },
    });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [OptionalAuthTestController],
    })
      .overrideProvider(KakaoTokenVerifier)
      .useValue(
        new FakeVerifier(
          {
            'kakao-minsu': {
              providerUid: 'kakao-uid-1',
              email: MINSU_EMAIL,
              name: '민수',
            },
            'kakao-noemail': {
              providerUid: 'kakao-uid-2',
              email: null,
              name: '이메일미동의',
            },
            // 같은 계정(uid-2)이 동의항목 심사 통과 후 이메일을 제공하기 시작한 상황
            'kakao-noemail-later': {
              providerUid: 'kakao-uid-2',
              email: `later@${EMAIL_DOMAIN}`,
              name: '이메일미동의',
            },
          },
          { 'valid-kakao-code': 'kakao-minsu' },
        ),
      )
      .overrideProvider(GoogleTokenVerifier)
      .useValue(
        new FakeVerifier({
          'google-minsu': {
            providerUid: 'google-uid-1',
            email: MINSU_EMAIL,
            name: 'Minsu',
          },
        }),
      )
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  let userId: string;
  let accessToken: string;
  let refreshToken: string;

  describe('소셜 로그인', () => {
    it('검증에 실패한 토큰이면 401', () =>
      request(app.getHttpServer())
        .post('/auth/login/kakao')
        .send({ token: 'invalid-token' })
        .expect(401));

    it('token도 code도 없으면 400', () =>
      request(app.getHttpServer())
        .post('/auth/login/kakao')
        .send({})
        .expect(400));

    it('이메일이 안 오면 임시 이메일로 가입시킨다 (동의항목 심사 전 임시방편)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login/kakao')
        .send({ token: 'kakao-noemail' })
        .expect(201);

      const body = res.body as LoginBody;
      expect(body.isNewUser).toBe(true);

      const dbUser = await prisma.user.findUnique({
        where: { id: body.user.id },
      });
      expect(dbUser?.email).toBe('kakao-kakao-uid-2@social.invalid');
    });

    it('임시 이메일 계정에 실제 이메일이 생기면 재로그인 때 교체된다', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login/kakao')
        .send({ token: 'kakao-noemail-later' })
        .expect(201);

      const body = res.body as LoginBody;
      expect(body.isNewUser).toBe(false);

      const dbUser = await prisma.user.findUnique({
        where: { id: body.user.id },
      });
      expect(dbUser?.email).toBe(`later@${EMAIL_DOMAIN}`);
    });

    it('첫 카카오 로그인이면 유저를 만들고 토큰 쌍을 준다', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login/kakao')
        .send({ token: 'kakao-minsu' })
        .expect(201);

      const body = res.body as LoginBody;
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      expect(body.isNewUser).toBe(true);
      // user는 @onnuri/shared User 계약을 따른다 — 이름은 소셜 프로필에서 온다.
      expect(body.user.name).toBe('민수');

      userId = body.user.id;
      accessToken = body.accessToken;
      refreshToken = body.refreshToken;
    });

    it('재로그인이면 같은 유저로 들어온다', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login/kakao')
        .send({ token: 'kakao-minsu' })
        .expect(201);

      const body = res.body as LoginBody;
      expect(body.isNewUser).toBe(false);
      expect(body.user.id).toBe(userId);
    });

    it('같은 이메일의 구글 로그인이면 기존 유저에 연결된다', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login/google')
        .send({ token: 'google-minsu' })
        .expect(201);

      const body = res.body as LoginBody;
      expect(body.isNewUser).toBe(false);
      expect(body.user.id).toBe(userId);
    });

    it('인가 코드로도 로그인할 수 있다 (백엔드가 코드를 교환)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login/kakao')
        .send({
          code: 'valid-kakao-code',
          redirectUri: 'http://localhost:3000/oauth-test',
        })
        .expect(201);

      expect((res.body as LoginBody).user.id).toBe(userId);
    });

    it('무효한 인가 코드면 401', () =>
      request(app.getHttpServer())
        .post('/auth/login/kakao')
        .send({
          code: 'bad-code',
          redirectUri: 'http://localhost:3000/oauth-test',
        })
        .expect(401));
  });

  describe('인증 가드', () => {
    it('보호된 엔드포인트는 토큰 없이 401', () =>
      request(app.getHttpServer()).get('/users/me').expect(401));

    it('보호된 엔드포인트는 액세스 토큰으로 통과한다', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect((res.body as { id: string }).id).toBe(userId);
    });

    it('선택적 인증은 토큰이 없으면 게스트로 통과한다', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth-e2e-optional')
        .expect(200);

      expect((res.body as { userId: string | null }).userId).toBeNull();
    });

    it('선택적 인증은 유효한 토큰이면 유저를 식별한다', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth-e2e-optional')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect((res.body as { userId: string | null }).userId).toBe(userId);
    });

    it('선택적 인증도 무효 토큰이면 401', () =>
      request(app.getHttpServer())
        .get('/auth-e2e-optional')
        .set('Authorization', 'Bearer not-a-jwt')
        .expect(401));
  });

  describe('리프레시 토큰 회전', () => {
    it('리프레시하면 새 토큰 쌍을 주고 이전 리프레시 토큰은 무효가 된다', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(201);

      const body = res.body as TokenPairBody;
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      expect(body.refreshToken).not.toBe(refreshToken);

      // 회전된(이미 사용한) 토큰 재사용은 거부된다.
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      // 새 액세스 토큰은 정상 동작한다.
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${body.accessToken}`)
        .expect(200);

      refreshToken = body.refreshToken;
    });

    it('서명이 다른 리프레시 토큰이면 401', () =>
      request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'not-a-jwt' })
        .expect(401));

    it('로그아웃하면 리프레시 토큰이 무효가 된다', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken })
        .expect(204);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });
});
