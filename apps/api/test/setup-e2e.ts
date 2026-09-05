// 개발용 로그인(AUTH_DEV_LOGIN)을 e2e에서 켠다. ConfigModule.forRoot() 검증은 app.module을
// import하는 순간 실행되므로, 테스트 파일 상단이 아니라 그보다 먼저 도는 jest setupFiles에서 설정한다.
process.env.AUTH_DEV_LOGIN = 'true';
