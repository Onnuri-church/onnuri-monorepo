import * as Sentry from '@sentry/nestjs';
import { config as loadEnv } from 'dotenv';

// ConfigModule보다 먼저 실행되므로 .env를 직접 읽는다.
loadEnv({ quiet: true });

// SENTRY_DSN이 비어 있으면 SDK가 비활성 상태로 동작한다 (로컬 개발 기본값).
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? 'development',
  sendDefaultPii: false,
});
