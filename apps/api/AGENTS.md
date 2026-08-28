# AGENTS.md (apps/api)

백엔드(NestJS) 작업 전용 규칙. 공통 규칙은 루트 [AGENTS.md](../../AGENTS.md), 시스템 구조는 [ARCHITECTURE.md](../../ARCHITECTURE.md)를 먼저 본다.

## 로컬 세팅

1. `apps/api/.env.example`을 복사해 `apps/api/.env` 생성 후 값 채우기
2. 로컬 Postgres 준비 — **아직 팀 차원에서 정해진 방법이 없음** (지금은 프론트 작업이 우선이라 보류 중. API 작업 착수 전 담당자가 방법을 정하고 이 항목을 갱신할 것)
3. `prisma:migrate` → `prisma:generate` → `start:dev` 순으로 실행

## 도메인 모듈 만들 때

ARCHITECTURE.md의 "Backend Module Shape"를 따른다 — `Controller` + `Service` + `dto/`만 쓰고 `Repository`/`Domain` 레이어를 새로 만들지 않는다 (Clean/Hexagonal을 기각한 결정과 일관되게 유지). Service가 `PrismaService`를 직접 쓴다.

## Prisma

`prisma/schema.prisma`를 바꾸면 반드시 `pnpm --filter @onnuri/api run prisma:generate`를 다시 돌린다 — 안 돌리면 타입이 스키마와 안 맞는다.

## 지켜야 하는 기존 동작

- `PrismaService.onModuleInit`은 DB 연결 실패를 삼키고 경고만 로그한다 (서버 부팅이 막히지 않게 하려는 의도적 처리). 이 catch를 제거하지 않는다.
- `JwtAuthGuard`는 `common/guards`에 있다 — `auth`/`users` 모듈이 서로를 순환 참조하지 않게 하려는 배치다. 다른 모듈 안으로 옮기지 않는다.
- DI로 주입받는 생성자 파라미터에는 타입 별칭을 쓰지 않는다. `jwt.strategy.ts`처럼 `ConfigService<AppConfig, true>`로 클래스를 직접 쓴다.

## 응답 포맷

- 컨트롤러는 서비스 반환값을 가공 없이 그대로 반환한다 (`{success, data}` 같은 공통 envelope로 감싸지 않는다). `packages/shared`에 그런 envelope 타입을 새로 만들지 않는다 — 이전에 있던 미사용 `ApiResponse`/`ApiError` 타입도 이 이유로 제거함.
- 에러는 NestJS 기본 예외 처리를 그대로 쓴다: 입력 검증 실패는 `class-validator` + `ValidationPipe`가 자동으로 400을 반환하고, 그 외 실패는 `UnauthorizedException` 등 Nest 내장 `HttpException` 계열을 던진다. 커스텀 전역 `ExceptionFilter`로 에러 모양을 새로 정의하지 않는다.
- 응답 모양을 바꿔야 할 필요가 생기면(예: 페이지네이션에 `packages/shared`의 `PaginatedResult` 사용) 이 문서와 함께 갱신한다.

## 테스트

새 도메인 모듈(`posts`, `teams` 등)을 추가할 때, 아래처럼 **실패해도 겉으로 티가 안 나는 로직**은 최소 1개 이상 E2E 테스트(`test/*.e2e-spec.ts`, `pnpm --filter @onnuri/api run test:e2e`)로 커버한다. 단순 CRUD 조회 등 나머지는 강제하지 않는다.

- 인증/인가: 토큰 없이 또는 잘못된 토큰으로 보호된 엔드포인트 접근 시 401
- 소유권 검증: 본인 소유가 아닌 리소스(예: 남의 글) 수정/삭제 시도 시 거부
- 로그인/회원가입의 실패 케이스 (잘못된 비밀번호, 중복 이메일 등)
