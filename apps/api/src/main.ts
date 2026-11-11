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
  const config = app.get<TypedConfigService>(ConfigService);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(config.get('port', { infer: true }));
}
void bootstrap();
