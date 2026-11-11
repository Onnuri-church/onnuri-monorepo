import './instrument';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';
import { type TypedConfigService } from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Render는 프록시 한 겹 뒤에서 돈다 — 이걸 켜야 req.ip가 프록시가 아닌 실제 접속 IP가 된다
  // (요청 횟수 제한의 IP 단위 집계가 모든 사람을 한 IP로 세지 않게).
  app.set('trust proxy', 1);
  // 기본 보안 헤더 (SCRUM-190) — JSON API라 최소한만: 서버 종류를 숨기고, 응답을 다른 형식으로
  // 해석하거나 다른 사이트 화면에 끼워 넣지 못하게 한다.
  app.disable('x-powered-by');
  app.use(
    (
      _req: unknown,
      res: { setHeader: (k: string, v: string) => void },
      next: () => void,
    ) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Referrer-Policy', 'no-referrer');
      next();
    },
  );
  const config = app.get<TypedConfigService>(ConfigService);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(config.get('port', { infer: true }));
}
void bootstrap();
