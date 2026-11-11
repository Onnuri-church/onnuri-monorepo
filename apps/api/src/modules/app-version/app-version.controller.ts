import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppVersionPolicy } from '@onnuri/shared';

import { type AppConfig } from '../../config/configuration';

// 앱 버전 정책 (SCRUM-193) — 앱이 시작할 때 물어보고, 자기 버전이 minVersion보다 낮으면
// 업데이트 안내 화면만 보여준다. 로그인 전에도 불러야 해서 인증 없이 열려 있다 (설정값만 돌려준다).
// 큰 API 변경 뒤 예전 앱이 고장 난 채로 쓰이지 않게 하려는 장치 — Render 환경변수만 바꾸면 된다.
@Controller('app')
export class AppVersionController {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  @Get('version')
  getPolicy(): AppVersionPolicy {
    const { minVersion, androidStoreUrl, iosStoreUrl } = this.config.get(
      'appVersion',
      {
        infer: true,
      },
    );
    return {
      minVersion,
      storeUrl: { android: androidStoreUrl, ios: iosStoreUrl },
    };
  }
}
