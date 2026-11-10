import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse } from 'dotenv';

// 개발용 로그인 비밀 헤더. 서버는 .env 값을 process.env보다 우선하므로(env.validation.ts),
// 로컬 .env에 AUTH_DEV_LOGIN_SECRET이 있으면 그 값을 써야 헤더가 맞는다. 없으면(CI 등)
// setup-e2e.ts가 아래 고정값을 process.env에 넣는다.
const envPath = join(__dirname, '..', '.env');
const fromEnvFile = existsSync(envPath)
  ? parse(readFileSync(envPath)).AUTH_DEV_LOGIN_SECRET
  : undefined;

export const DEV_LOGIN_SECRET =
  fromEnvFile || 'e2e-dev-login-secret-0123456789abcdef';

export const DEV_LOGIN_HEADER = { 'X-Dev-Login-Secret': DEV_LOGIN_SECRET };
