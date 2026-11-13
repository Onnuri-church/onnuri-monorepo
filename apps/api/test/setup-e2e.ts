import { DEV_LOGIN_SECRET, REVIEW_LOGIN } from './dev-login';

// 개발용 로그인(AUTH_DEV_LOGIN)을 e2e에서 켠다. ConfigModule.forRoot() 검증은 app.module을
// import하는 순간 실행되므로, 테스트 파일 상단이 아니라 그보다 먼저 도는 jest setupFiles에서 설정한다.
process.env.AUTH_DEV_LOGIN = 'true';
process.env.AUTH_DEV_LOGIN_SECRET = DEV_LOGIN_SECRET;
// 스토어 심사용 로그인 (SCRUM-197)
process.env.REVIEW_LOGIN_ID = REVIEW_LOGIN.id;
process.env.REVIEW_LOGIN_PASSWORD = REVIEW_LOGIN.password;

// 요청 횟수 제한(SCRUM-165)은 끈다 — e2e는 한 IP에서 수백 번 요청한다. rate-limit 테스트만 다시 켠다.
process.env.RATE_LIMIT_DISABLED = 'true';
