import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';

import type { DevLoginRole } from '@onnuri/shared';

import { CellRole, SocialProvider, TeamRole } from '../../../generated/prisma';
import { type AppConfig } from '../../config/configuration';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { KakaoLoginDto } from './dto/kakao-login.dto';
import { ReviewAccountService } from './review-account.service';
import { GoogleTokenVerifier } from './social/google-token.verifier';
import { KakaoTokenVerifier } from './social/kakao-token.verifier';
import type { SocialProfile } from './social/social-profile';
import type { JwtPayload } from './strategies/jwt.strategy';

// 이미 쓴 리프레시 토큰이 이 시간 안에 다시 오면 앱의 겹친 요청으로 보고 세션을 끊지 않는다.
const REFRESH_REUSE_GRACE_MS = 30 * 1000;

interface RefreshPayload {
  sub: string;
  jti: string;
}

// 임시방편: 카카오 이메일 동의항목이 심사 전이라 이메일이 안 온다. 유저를 만들려면
// email(NOT NULL 유니크)이 필요하므로, 실존할 수 없는 예약 도메인(.invalid)으로 임시
// 이메일을 만들어 가입시키고, 나중에 실제 이메일이 오면 재로그인 시점에 교체한다
// (findOrCreateUser 참고). 심사 통과 후 이 임시방편 제거를 검토한다 — ARCHITECTURE.md Known Issues.
const PLACEHOLDER_EMAIL_DOMAIN = 'social.invalid';

// 개발용 로그인의 팀장/셀장 역할이 붙는 고정 팀·셀 — 없으면 만들고, 있으면 재사용한다.
const DEV_TEAM_NAME = '개발팀';
const DEV_CELL_NAME = '개발셀';

function placeholderEmail(provider: SocialProvider, providerUid: string) {
  return `${provider.toLowerCase()}-${providerUid}@${PLACEHOLDER_EMAIL_DOMAIN}`;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly kakaoVerifier: KakaoTokenVerifier,
    private readonly googleVerifier: GoogleTokenVerifier,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly reviewAccounts: ReviewAccountService,
  ) {}

  async loginWithKakao(input: KakaoLoginDto) {
    let accessToken: string;
    if (input.token) {
      accessToken = input.token;
    } else if (input.code && input.redirectUri) {
      accessToken = await this.kakaoVerifier.exchangeCode(
        input.code,
        input.redirectUri,
      );
    } else {
      // DTO 검증이 걸러주지만, 타입 좁히기를 위해 명시적으로 처리한다.
      throw new BadRequestException(
        'token 또는 code+redirectUri가 필요합니다.',
      );
    }

    const profile = await this.kakaoVerifier.verify(accessToken);
    return this.login(SocialProvider.KAKAO, profile);
  }

  async loginWithGoogle(idToken: string) {
    const profile = await this.googleVerifier.verify(idToken);
    return this.login(SocialProvider.GOOGLE, profile);
  }

  // 개발용: 소셜 SDK가 없는 웹·Expo Go에서 유저 기반 기능을 개발할 수 있게 이메일만으로
  // 로그인시킨다. AUTH_DEV_LOGIN=true인 환경에서만 열리고, 꺼진 환경에선 404로 존재를 숨긴다.
  // role을 주면 그 역할로 확인할 수 있게 관리자 플래그·팀장/셀장 멤버십을 함께 세팅한다.
  // 개발 서버는 실제 성도 계정이 있는 공용 DB를 쓰므로 (1) 비밀 헤더가 맞아야 하고
  // (2) 소셜 로그인이 연결된 실제 계정으로는 들어갈 수 없다 — 둘 다 없으면 이메일만으로
  // 남의 계정에 들어가 관리자 권한까지 줄 수 있었다.
  async loginWithDev(
    email: string,
    role: DevLoginRole = 'MEMBER',
    secret?: string,
  ) {
    if (!this.config.get('auth.devLoginEnabled', { infer: true })) {
      throw new NotFoundException();
    }
    if (!this.isDevLoginSecretValid(secret)) {
      throw new UnauthorizedException(
        '개발용 로그인 비밀 헤더가 올바르지 않습니다.',
      );
    }

    let existing = await this.prisma.user.findUnique({
      where: { email },
      include: { _count: { select: { socialAccounts: true } } },
    });
    // 탈퇴한 계정으로는 들어가지 않고 새로 만든다 (소셜 로그인과 같은 기준).
    if (existing?.withdrawnAt) {
      await this.usersService.detachWithdrawn(existing.id);
      existing = null;
    }
    if (existing && existing._count.socialAccounts > 0) {
      throw new ForbiddenException(
        '소셜 로그인으로 가입한 계정은 개발용 로그인으로 들어갈 수 없습니다.',
      );
    }
    const user =
      existing ??
      (await this.prisma.user.create({
        data: { email, name: email.split('@')[0] },
      }));
    await this.provisionDevRole(user.id, role);
    return this.buildLoginResponse(user.id, !existing);
  }

  // 스토어 심사용 로그인 (SCRUM-197). 소셜 로그인만 있으면 심사자가 들어올 수 없어서, 심사 정보에
  // 적어 둔 아이디·비밀번호로 심사 전용 계정에 들어가게 한다. 이 계정과 심사용 팀·셀·소그룹은 실제
  // 성도에게 보이지 않는다 (common/review/review-scope.ts). 환경변수가 없으면 404로 존재를 숨긴다.
  async loginForReview(id: string, password: string) {
    const expectedId = this.config.get('auth.reviewLoginId', { infer: true });
    const expectedPassword = this.config.get('auth.reviewLoginPassword', {
      infer: true,
    });
    if (!expectedId || !expectedPassword) throw new NotFoundException();
    // 둘 다 끝까지 비교한다 — 아이디만 먼저 틀렸다고 빨리 끝나면 아이디를 추측할 단서가 된다.
    const idOk = this.safeEqual(id, expectedId);
    const passwordOk = this.safeEqual(password, expectedPassword);
    if (!idOk || !passwordOk) {
      throw new UnauthorizedException(
        '아이디 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    const user = await this.reviewAccounts.findOrCreateReviewer();
    await this.reviewAccounts.provision(user.id);
    return this.buildLoginResponse(user.id, false);
  }

  // 길이가 달라도 비교 시간이 같도록 해시끼리 비교한다 (timingSafeEqual은 길이가 다르면 throw).
  private isDevLoginSecretValid(secret: string | undefined) {
    const expected = this.config.get('auth.devLoginSecret', { infer: true });
    if (!expected || !secret) return false;
    return this.safeEqual(secret, expected);
  }

  private safeEqual(value: string, expected: string) {
    const digest = (input: string) =>
      createHash('sha256').update(input).digest();
    return timingSafeEqual(digest(value), digest(expected));
  }

  // 개발용 역할 세팅 — 등급의 실체는 isAdmin·멤버십이므로 역할별로 그 상태를 만들어준다.
  // 재로그인마다 불리므로 멱등이어야 한다. 멤버십 테이블에는 (팀/셀, 유저) 유니크 제약이
  // 없어 upsert 대신 활성 멤버십(endedAt: null)을 확인하고 없을 때만 만든다.
  private async provisionDevRole(userId: string, role: DevLoginRole) {
    if (role === 'ADMIN') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isAdmin: true },
      });
      return;
    }

    if (role === 'TEAM_LEADER') {
      const team =
        (await this.prisma.team.findUnique({
          where: { name: DEV_TEAM_NAME },
        })) ??
        (await this.prisma.team.create({ data: { name: DEV_TEAM_NAME } }));

      const membership = await this.prisma.teamMembership.findFirst({
        where: { teamId: team.id, userId, endedAt: null },
      });
      if (!membership) {
        await this.prisma.teamMembership.create({
          data: {
            teamId: team.id,
            userId,
            role: TeamRole.LEADER,
            startedAt: new Date(),
          },
        });
      }
      return;
    }

    if (role === 'CELL_LEADER') {
      const now = new Date();
      const cell =
        (await this.prisma.cell.findFirst({
          where: { name: DEV_CELL_NAME, deletedAt: null },
        })) ??
        (await this.prisma.cell.create({
          data: {
            name: DEV_CELL_NAME,
            startedAt: now,
            // 자연 만료로 종료되지 않게 넉넉히 — 개발용 고정 셀이다.
            expiresAt: new Date(
              now.getFullYear() + 10,
              now.getMonth(),
              now.getDate(),
            ),
            createdById: userId,
          },
        }));

      const membership = await this.prisma.cellMembership.findFirst({
        where: { cellId: cell.id, userId, endedAt: null },
      });
      if (!membership) {
        // 실제 셀장 지정(CellsService.assignRole)처럼 다른 셀 소속은 끝내고 옮긴다 — 안 그러면
        // 소속이 두 개가 되어 /users/me가 엉뚱한 셀을 "내 셀"로 고른다.
        await this.prisma.$transaction([
          this.prisma.cellMembership.updateMany({
            where: { userId, endedAt: null },
            data: { endedAt: now },
          }),
          this.prisma.cellMembership.create({
            data: {
              cellId: cell.id,
              userId,
              role: CellRole.LEADER,
              startedAt: now,
            },
          }),
        ]);
      }
    }
    // MEMBER는 세팅할 것이 없다.
  }

  // 리프레시 토큰 회전 + 재사용 감지 (SCRUM-166).
  // 쓴 토큰은 지우지 않고 usedAt만 찍어 만료까지 남긴다. 이미 쓴 토큰이 다시 오면 누군가 토큰을
  // 복사해 쓰고 있다는 뜻일 수 있어서, 그 로그인 세션(familyId)의 토큰을 모두 지운다 — 진짜
  // 주인과 훔친 쪽 모두 다시 로그인해야 하고, 훔친 쪽은 소셜 로그인을 못 하니 거기서 끊긴다.
  async refresh(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
      select: { tokenHash: true, familyId: true, usedAt: true },
    });
    if (!stored || stored.tokenHash !== this.hash(refreshToken)) {
      throw new UnauthorizedException(
        '이미 사용됐거나 무효화된 리프레시 토큰입니다.',
      );
    }

    // 아직 안 쓴 토큰이면 "쓴 것"으로 바꾼다 — 조건부 갱신이라 동시에 두 번 와도 한쪽만 이긴다.
    const consumed = await this.prisma.refreshToken.updateMany({
      where: { id: payload.jti, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (consumed.count === 0) {
      await this.handleReuse(payload.jti, stored.familyId);
      throw new UnauthorizedException(
        '이미 사용됐거나 무효화된 리프레시 토큰입니다.',
      );
    }
    return this.issueTokenPair(payload.sub, stored.familyId);
  }

  // 쓴 지 얼마 안 된 토큰의 재요청은 탈취보다 앱의 겹친 요청·재시도일 가능성이 커서 세션을 끊지 않는다
  // (그 요청만 401 — 먼저 받은 새 토큰은 그대로 쓸 수 있다). 그보다 늦게 다시 오면 세션 전체를 끊는다.
  private async handleReuse(jti: string, familyId: string) {
    const token = await this.prisma.refreshToken.findUnique({
      where: { id: jti },
      select: { usedAt: true },
    });
    const usedAt = token?.usedAt?.getTime() ?? 0;
    if (Date.now() - usedAt <= REFRESH_REUSE_GRACE_MS) return;
    await this.prisma.refreshToken.deleteMany({ where: { familyId } });
  }

  // 로그아웃 — 그 기기의 로그인 세션(묶음)을 통째로 지운다. 다른 기기 로그인은 그대로.
  async logout(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
      select: { tokenHash: true, familyId: true },
    });
    if (!stored || stored.tokenHash !== this.hash(refreshToken)) return;
    await this.prisma.refreshToken.deleteMany({
      where: { familyId: stored.familyId },
    });
  }

  private async login(provider: SocialProvider, profile: SocialProfile) {
    const { user, isNewUser } = await this.findOrCreateUser(provider, profile);
    return this.buildLoginResponse(user.id, isNewUser);
  }

  private async buildLoginResponse(userId: string, isNewUser: boolean) {
    const tokens = await this.issueTokenPair(userId);
    return {
      ...tokens,
      isNewUser,
      user: await this.usersService.findById(userId),
    };
  }

  private async findOrCreateUser(
    provider: SocialProvider,
    profile: SocialProfile,
  ) {
    const account = await this.prisma.socialAccount.findUnique({
      where: {
        provider_providerUid: { provider, providerUid: profile.providerUid },
      },
      select: { user: true },
    });
    // 이 변경 전에 탈퇴한 계정은 연결이 남아 있다 — 끊고 아래에서 새로 가입시킨다.
    if (account?.user.withdrawnAt) {
      await this.usersService.detachWithdrawn(account.user.id);
    } else if (account) {
      // 임시 이메일로 가입했던 계정에 실제 이메일이 생겼으면(동의항목 심사 통과 후) 교체한다.
      const user = await this.replacePlaceholderEmail(
        account.user,
        profile.email,
      );
      return { user, isNewUser: false };
    }

    // email은 카카오·구글 계정을 같은 사람으로 연결하는 축인데, 카카오가 심사 전이라
    // 이메일을 안 줄 수 있다 — 그 경우 임시 이메일로 가입시킨다 (파일 상단 주석 참고).
    const email =
      profile.email ?? placeholderEmail(provider, profile.providerUid);

    // 같은 이메일의 기존 유저가 있으면 새 로그인 수단으로 연결한다 (카카오·구글 병용).
    let existing = await this.prisma.user.findUnique({ where: { email } });
    // 탈퇴한 계정에는 연결하지 않는다 — 이메일을 비워 새 가입이 그 이메일을 쓸 수 있게 한다.
    if (existing?.withdrawnAt) {
      await this.usersService.detachWithdrawn(existing.id);
      existing = null;
    }
    if (existing) {
      await this.prisma.socialAccount.create({
        data: {
          userId: existing.id,
          provider,
          providerUid: profile.providerUid,
        },
      });
      return { user: existing, isNewUser: false };
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        // 프로필 미제공 시 임시 이름 — 프로필 설정 화면에서 다시 입력받는다.
        name: profile.name ?? email.split('@')[0],
        // 소셜 프로필 사진을 기본 아바타로 — 가입 시점에만 채운다. 이후에는 본인이
        // 바꾼 사진이 우선이라 재로그인에서 덮어쓰지 않는다 (기존 유저 분기에 없음).
        avatarUrl: profile.avatarUrl,
        socialAccounts: {
          create: { provider, providerUid: profile.providerUid },
        },
      },
    });
    return { user, isNewUser: true };
  }

  private async replacePlaceholderEmail(
    user: { id: string; email: string },
    email: string | null,
  ) {
    if (!email || !user.email.endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`)) {
      return user;
    }
    try {
      return await this.prisma.user.update({
        where: { id: user.id },
        data: { email },
      });
    } catch {
      // 그 이메일을 이미 쓰는 다른 계정이 있으면(유니크 충돌) 임시 이메일을 유지한다 —
      // 계정 병합이 필요한 케이스라 로그인 자체는 막지 않는다.
      return user;
    }
  }

  // familyId를 안 주면 새 로그인 — 첫 토큰의 jti가 묶음 이름이 된다.
  private async issueTokenPair(userId: string, familyId?: string) {
    const payload: JwtPayload = { sub: userId };
    const accessToken = this.jwtService.sign(payload);

    const jti = randomUUID();
    const refreshToken = this.jwtService.sign(
      { sub: userId, jti },
      {
        secret: this.config.get('jwt.refreshSecret', { infer: true }),
        expiresIn: this.config.get('jwt.refreshExpiresIn', { infer: true }),
      },
    );
    const { exp } = this.jwtService.decode<{ exp: number }>(refreshToken);
    await this.prisma.refreshToken.create({
      data: {
        id: jti,
        userId,
        familyId: familyId ?? jti,
        tokenHash: this.hash(refreshToken),
        expiresAt: new Date(exp * 1000),
      },
    });
    // 쓴 토큰을 남기게 되면서 행이 쌓인다 — 이 사람의 만료된 토큰은 발급 때마다 치운다.
    await this.prisma.refreshToken.deleteMany({
      where: { userId, expiresAt: { lt: new Date() } },
    });
    return { accessToken, refreshToken };
  }

  private async verifyRefreshToken(
    refreshToken: string,
  ): Promise<RefreshPayload> {
    try {
      return await this.jwtService.verifyAsync<RefreshPayload>(refreshToken, {
        secret: this.config.get('jwt.refreshSecret', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
    }
  }

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
