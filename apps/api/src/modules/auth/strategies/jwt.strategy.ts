import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { setViewer } from '../../../common/review/review-scope';
import { type AppConfig } from '../../../config/configuration';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
}

// 토큰을 확인하면서 읽어 둔 사용자 상태 (SCRUM-286) — 가드·인터셉터가 User를 다시 읽지 않고 이 값을 쓴다.
export interface AuthUser extends JwtPayload {
  isAdmin: boolean;
  suspendedUntil: Date | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<AppConfig, true>,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('jwt.accessSecret', { infer: true }),
    });
  }

  // 액세스 토큰은 서명만 맞으면 만료(15분)까지 통한다 — 탈퇴·강제탈퇴한 계정이 그 사이에
  // 계속 쓰지 못하게 요청마다 계정이 살아 있는지 확인한다 (회원 수가 적어 조회 비용은 작다).
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        withdrawnAt: true,
        isReviewAccount: true,
        isAdmin: true,
        suspendedUntil: true,
      },
    });
    if (!user || user.withdrawnAt) {
      throw new UnauthorizedException('탈퇴했거나 없는 계정입니다.');
    }
    setViewer(payload.sub, user.isReviewAccount);
    return {
      sub: payload.sub,
      isAdmin: user.isAdmin,
      suspendedUntil: user.suspendedUntil,
    };
  }
}
