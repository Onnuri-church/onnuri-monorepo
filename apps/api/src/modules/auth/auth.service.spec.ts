import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { type AppConfig } from '../../config/configuration';
import { AuthService } from './auth.service';

// 개발용 로그인 게이트: 켜졌을 때 동작은 e2e가 커버하고, 여기서는 기본(꺼짐)에서
// 존재를 숨기는지(404)만 확인한다 — 실수로 켜진 채 배포되면 티가 안 나는 로직이라 명시적으로 막는다.
describe('AuthService.loginWithDev 게이트', () => {
  const buildService = (devLoginEnabled: boolean) => {
    const config = {
      get: () => devLoginEnabled,
    } as unknown as ConfigService<AppConfig, true>;
    const unused = undefined as unknown as never;
    return new AuthService(unused, unused, unused, unused, unused, config);
  };

  it('AUTH_DEV_LOGIN이 꺼져 있으면 NotFoundException(404)', async () => {
    await expect(
      buildService(false).loginWithDev('dev@example.com'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
