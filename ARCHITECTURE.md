# Architecture

이 문서는 `onnuri-monorepo`의 시스템 경계, 앱/패키지 구조, 모듈 기준을 정의한다. 기획 의도·기능 목록은 [README.md](README.md), 모바일 UI 규칙(컬러/타이포/네비게이션 등)은 [apps/mobile/DESIGN.md](apps/mobile/DESIGN.md)를 본다. 구현이 바뀌면 이 문서도 같이 갱신한다.

## System Boundary

지금 스코프(README MVP 기준)는 다음을 포함한다.

* 인증, 세션 (로그인/마이페이지)
* 말씀 영상 열람
* 주보 열람
* 게시판 (큐티나눔, 팀별 게시판, 기도 요청)
* 소그룹 모임
* 실시간 예배 (라이브 스트림)
* 부서 스토리

유저 등급/어드민 권한, 헌금 연동, 다국어, 셀 채팅방 등은 README의 "추가 기능" 스코프로, 이 문서가 다루는 현재 시스템 경계 밖이다.

## Monorepo Shape

pnpm 워크스페이스. 패키지 매니저는 pnpm으로 고정(`package.json`의 `packageManager` 필드), npm/yarn 섞어 쓰지 않는다.

```
onnuri-monorepo/
├── apps/
│   ├── mobile/      React Native (Expo) — 프론트엔드
│   └── api/          NestJS — 백엔드
├── packages/
│   ├── shared/       프론트·백 공유 타입/상수/유틸 (@onnuri/shared)
│   └── config/       공유 ESLint/Prettier/tsconfig (@onnuri/config)
├── docs/              기획·설계 문서, 유저 플로우
└── scripts/
```

앱은 실행 단위, 패키지는 공유 단위다. 프론트·백이 같이 쓰는 타입/상수/유틸은 특정 앱에 중복 구현하지 않고 `packages/shared`에 둔다.

## Architecture Decisions

두 앱 다 팀 규모(7명)·기간(6개월)·현재 도메인 복잡도 기준으로 "지금 필요한 만큼만" 원칙으로 정했다. 이미 있는 대안을 왜 안 썼는지 기록해서 나중에 같은 논의를 반복하지 않는다.

| 영역 | 선택 | 기각한 대안과 이유 |
|---|---|---|
| 프론트 구조 | **기능별 폴더**(`src/features/*`) | FSD — 계층 간 import 규칙 강제 비용이 지금 팀 규모 대비 큼 |
| 백엔드 구조 | **NestJS 표준 도메인 모듈**(`src/modules/*`), Controller+Service만 (Repository/Domain 레이어 없음) | Clean/Hexagonal, CQRS — 인프라 교체·복잡한 도메인 규칙 등 지금 없는 문제를 미리 대비하는 격 |
| 패키지 매니저 | **pnpm** | — |
| 컬러 토큰 | **semantic만, primitive 없음** | primitive 원시 스케일은 앞으로도 필요 없다고 확정 (`tailwind.config.js`가 `colors`를 통째로 교체해 강제) |
| 오버레이 라이브러리 | **`@gorhom/bottom-sheet` 단일** | `react-native-modal`과 병행 — 서로 다른 애니메이션 시스템 두 개를 유지하는 중복 |

## App Responsibilities

* **`apps/mobile`** — 화면, 네비게이션, 로컬 상태(세션 등), 서버 상태 캐싱(TanStack Query). 도메인 규칙을 직접 판단하지 않고 API 응답을 그대로 반영한다.
* **`apps/api`** — 인증, 도메인 API, DB 접근, 트랜잭션. 고객에게 보이는 상태 문구·권한 판단은 프론트가 아니라 여기서 계산해 반환한다.

## Backend Configuration

* 환경변수는 부팅 시 `config/env.validation.ts`가 검증한다. 코드에 기본값을 두지 않는다. 로컬은 `.env`가 소스이고, 운영(Render 등 `.env` 파일 없이 플랫폼 환경변수로 주입하는 곳)을 위해 `validate()`가 `process.env`도 함께 검증한다 — 둘 다 있으면 `.env` 값이 우선한다.
* 환경변수는 `ConfigService`를 쓴다. `env()`는 검증 결과를 `configuration.ts`로 넘기는 다리라 호출처는 그 파일 하나뿐이다.
* 점 표기에는 `{ infer: true }`가 필요하다 — `config.get('jwt.accessSecret', { infer: true })`.
* 예외는 `src/instrument.ts` 하나뿐이다 — ConfigModule보다 먼저 실행돼야 해서 `dotenv`로 `.env`를 직접 읽고 `process.env`를 쓴다. 다른 곳에서 이 방식을 따라하지 않는다.

## Observability

에러 추적은 **Sentry**(`@sentry/nestjs`)를 쓴다. 지금은 `apps/api`만 계측돼 있고 `apps/mobile`은 아직 붙이지 않았다.

* `src/instrument.ts`가 `main.ts` 최상단에서 import된다. Sentry는 다른 모듈보다 먼저 초기화돼야 하므로 이 import는 항상 첫 줄이어야 한다.
* `SENTRY_DSN`이 비어 있으면 SDK가 비활성으로 동작한다 — 로컬 개발 기본값이며, DSN 없이도 서버는 정상 기동한다.
* **에러 모니터링만 켜져 있다.** Tracing·Profiling·Logs는 별도 쿼터를 소모해 무료 한도를 빠르게 태우므로 의도적으로 껐다. 필요해지면 그때 켠다.
* `sendDefaultPii: false` — 성도 개인정보가 에러 리포트에 실려 나가지 않게 하려는 의도적 설정이다. 켜기 전에 반드시 논의한다.
* `SentryGlobalFilter`를 `APP_FILTER`로 등록하지만, 이건 `BaseExceptionFilter`를 상속해 `super.catch()`로 위임하므로 **HTTP 응답 모양을 바꾸지 않는다** (`apps/api/AGENTS.md`의 "커스텀 전역 ExceptionFilter 금지"와 충돌하지 않는 이유). 4xx `HttpException`은 Sentry로 보내지 않고 걸러진다.

## Backend Module Shape

각 도메인 모듈은 아래 구조를 기본으로 가진다 (Repository/Domain 레이어 없이 Service가 Prisma를 직접 씀 — Architecture Decisions에서 Clean/Hexagonal을 기각한 것과 일관됨).

```
modules/<domain>/
  <domain>.module.ts
  <domain>.controller.ts   # HTTP 요청/응답, 입력 검증(class-validator), Service 호출
  <domain>.service.ts      # 유스케이스, 트랜잭션, PrismaService 직접 사용
  dto/                     # 요청/응답 DTO
  strategies/              # (필요한 모듈만) passport strategy 등
```

도메인은 화면이나 API 경로가 아니라 비즈니스 개념 기준으로 나눈다 (예: `auth`, `users` — 다음은 `posts`, `teams` 등).

```
apps/api/src/
├── modules/
│   ├── prisma/    PrismaService (전역 모듈) — DB 연결 실패해도 서버가 안 죽도록 onModuleInit에서 catch함
│   ├── auth/      소셜 로그인(카카오/구글), 액세스/리프레시 토큰 발급·회전 (social/ 토큰 검증기, strategies/jwt.strategy.ts)
│   └── users/     findById(공개 프로필 select), GET /users/me
└── common/
    ├── guards/    JwtAuthGuard(필수 인증) · OptionalJwtAuthGuard(게스트 허용) — auth/users 모듈 간 순환참조 피하려고 common에 둠
    ├── decorators/ CurrentUser
    ├── filters/   (비어있음)
    └── interceptors/ (비어있음)
```

스택: NestJS `^11.0.1`, PostgreSQL + Prisma **`^6.19.3`로 고정**(최신 7.x는 ESM 전용 + driver adapter 필수라 CommonJS 기반 Nest 스캐폴딩과 충돌해서 다운그레이드), `@nestjs/jwt` + `passport-jwt`, 구글 ID 토큰 검증은 `google-auth-library`(카카오는 REST 호출이라 SDK 불필요).

## Frontend Module Shape

기능(화면) 하나는 기본적으로 파일 하나다. 관련 파일(로컬 훅, 서브 컴포넌트)이 실제로 필요해지기 전까지 미리 폴더를 안 쪼갠다.

```
features/<name>/
  <Name>Screen.tsx   # 화면 컴포넌트. 필요해지면 같은 폴더에 파일 추가(폴더 미리 안 만듦)
```

```
apps/mobile/src/
├── features/       auth/ bulletin/ cell/ home/ live/ my-page/ qr/ qt-board/ sermon/ splash/ team-story/
├── navigation/     RootNavigator(인증 분기 Stack), BottomTabNavigator
└── shared/
    ├── api/        axios client(토큰 첨부, 401 시 refresh 후 재시도) · authApi/session(로그인·복원·로그아웃) · tokenStorage(SecureStore)
    ├── components/ 공용 UI 컴포넌트 (Header, Skeleton 등) — 파일별 폴더 안 만들고 flat
    ├── store/      Zustand (useAuthStore: session 판별 유니온 — user, access/refresh 토큰)
    ├── theme/      tokens.js(컬러·타입스케일 단일 소스), fonts.ts(폰트 로딩용 require 맵)
    ├── types/      navigation.ts (RootStackParamList, RootTabParamList, AuthStackParamList)
    └── hooks/      useAppBootstrap(앱 부팅 시 세션 복원 → status 확정)
```

스택: Expo `~57.0.7` / React Native `0.86.0`, NativeWind `^4.2.6` + Tailwind `^3.4.19`(규칙은 DESIGN.md), `@react-navigation`(Native Stack + Bottom Tabs), Zustand `^5.0.14`, TanStack Query + Axios, Pretendard 폰트, `@gorhom/bottom-sheet`(+ reanimated/gesture-handler/worklets), 미디어는 `expo-video`(영상 기능 착수 시 설치)/`react-native-image-zoom-viewer`/`react-native-webview`.

## Media Layer

* 말씀 영상 재생(`expo-video`), 주보 핀치 줌(`react-native-image-zoom-viewer`), 라이브 스트림(`react-native-webview`)은 각각 성격이 다른 네이티브 레이어이므로 공통 wrapper로 억지로 통합하지 않는다. 각 라이브러리의 기본 API를 그대로 노출하는 얇은 wrapper만 둔다.
* 라이브 스트림 WebView는 일요일 방송 시간 여부에 따라 렌더 분기(스트림 vs 안내 화면)한다 — 분기 로직은 화면 컴포넌트가 아니라 상위 훅(`useLiveServiceStatus` 등)에서 처리하고 화면은 상태만 받아 렌더링한다.
* 영상/이미지 로딩·에러 상태(버퍼링, 로드 실패, 빈 데이터)는 별도 확인 없이 스켈레톤/에러 placeholder로 처리 가능하나, 해당 상태의 컬러·사이즈는 [DESIGN.md](apps/mobile/DESIGN.md)의 컬러/사이즈 규칙을 동일하게 따른다.

## Access Model

지금은 두 등급이다: **`Guest`**(로그인 없이 둘러보기) vs **`User`**(JWT 인증 완료). `Partner`/`Admin` 같은 별도 등급은 아직 없다 — README의 "임원 회의 사항"(유저 등급, 어드민 계정)은 향후 스코프이며 지금 코드에 반영돼 있지 않다.

```
@UseGuards(JwtAuthGuard)          # 로그인 필수 — users.controller.ts의 /users/me 등
@UseGuards(OptionalJwtAuthGuard)  # 게스트 허용 — 토큰 없으면 user 없이 통과, 토큰이 있는데 무효(만료 포함)면 401
```

인증 흐름: 모바일 SDK가 받은 카카오 액세스 토큰/구글 ID 토큰을 `POST /auth/login/kakao|google`로 보내면 백엔드가 제공자에 검증 → `User`+`SocialAccount` find-or-create(같은 이메일이면 기존 유저에 로그인 수단 연결) → 액세스+리프레시 토큰 발급. 카카오는 SDK 토큰 대신 인가 코드(`{code, redirectUri}`)로도 로그인할 수 있다 — 백엔드가 REST 키+Client Secret으로 코드를 교환한다 (웹 흐름·수동 테스트용). 리프레시 토큰은 DB에 sha256 해시로 저장하고 `POST /auth/refresh`마다 회전(rotation)한다 — 한 번 쓴 리프레시 토큰은 재사용할 수 없다. 로그인 응답의 `isNewUser`로 프로필 설정 화면 분기를 판단한다.

* 세션 체크는 개별 화면이 아니라 `RootNavigator`가 `useAuthStore`의 `session.status`로 트리 전체를 분기해서 처리한다.
  * `loading`(아직 확인 전) → 스플래시. `NavigationContainer` 바깥에서 트리를 대신하며 스크린으로 등록하지 않는다
  * `authenticated` / `guest` → 같은 `Stack`(`Main`(BottomTabNavigator) + `QtBoard` + `Live` 등)
  * `unauthenticated` → `AuthStack`(`Login` + `ProfileSetup`). 소셜 로그인 버튼은 SDK(카카오 네이티브/구글 sign-in, dev build 필요) → `signInWithSocial`로 배선돼 있다 (`features/auth/socialLogin.ts` — SDK는 lazy import라 웹/Expo Go에서도 앱은 뜬다). 프로필 설정은 원래 `isNewUser`에 따라 갈릴 화면인데 AuthStack에만 있어 세션이 생기면 접근 불가라, 분기와 실제 저장은 프로필 등록 API 작업에서 함께 설계한다 — 그때까지 ProfileSetup은 진입 경로가 없고 등록하기의 임시 세션 배선만 남아 있다
* **게스트는 로그인한 유저와 같은 화면 트리를 본다.** 트리를 따로 만들지 않는 이유는 게스트가 못 하는 것이 화면 단위가 아니라 동작 단위(글 작성, 마이페이지의 내 정보 등)이기 때문이다 — 그 제한은 각 기능 담당자가 자기 화면에서 `session.status`를 보고 막고, 지금은 **아직 어느 화면에도 구현돼 있지 않다**(로그인 화면의 "게스트로 로그인하기"만 있는 상태).
* 게스트는 토큰이 없다. `shared/api/client.ts`의 요청 인터셉터가 `authenticated`일 때만 `Authorization`을 붙이므로 게스트 요청은 그냥 비인증 요청으로 나간다.
* **개발용 로그인**: 소셜 SDK가 없는 웹·Expo Go에서는 실제 로그인이 불가능해 유저 기반 기능을 개발할 수 없다. 이를 위해 `POST /auth/login/dev`(이메일만으로 진짜 유저+토큰 발급)를 두고, 백엔드는 `AUTH_DEV_LOGIN=true`인 환경에서만 응답한다(아니면 404로 숨김, 운영 금지). 모바일은 로그인 화면에 `__DEV__`에서만 보이는 "[DEV] 개발용 로그인" 버튼으로 연결한다.
* 세션은 필드 여러 개가 아니라 **판별 유니온 값 하나**(`session`)다. `accessToken`이 null인 것만으로는 "세션 없음"과 "아직 확인 전"이 구분되지 않는데, 상태를 별도 필드로 두면 둘을 손으로 맞춰야 하고 한쪽만 바꾸는 실수가 조용히 통과한다. 유니온이면 어긋난 조합 자체가 만들어지지 않고, `user`/`accessToken`은 `authenticated` 가지에서만 읽힌다 — 그 밖에서 접근하면 컴파일 에러다.
* 토큰은 `expo-secure-store`에 저장되고, 앱 부팅 시 `useAppBootstrap`이 refresh로 세션을 복원한다. 로그인 상태에서 API가 401을 주면 `shared/api/client.ts`의 응답 인터셉터가 리프레시 후 원 요청을 한 번 재시도하고, 리프레시까지 실패하면 Alert → 확인 누르면 `clearSession()` → 자동으로 로그인 화면 전환 (별도 네비게이션 호출 없음). 게스트/비로그인 상태의 401은 세션 문제가 아니므로 호출한 쪽에 그대로 전달된다.
* 유저 등급이 추가되면(향후) capability 기반 가드 조합(`@UseGuards(AuthGuard, XGuard)`)으로 확장하고, 리소스 소유권 검증(예: 내 글만 수정 가능)을 role 체크와 별도로 반드시 추가한다.

## Deployment

(2026-09-04 확정) 배포 대상과 시점:

* **API — Render.** 개발 중에는 무료 인스턴스(15분 유휴 시 잠들고 깨어날 때 30초~1분 콜드 스타트 — 개발 단계에선 감수). 실사용(출시) 직전에 Starter(월 $7)로 올려 상시 가동으로 전환한다. 무료 티어의 750시간/월 제한은 무료 전용이라 유료 전환 후에는 계정 분리·시간 제한이 없다.
* **DB — 로컬 개발은 Docker Postgres**(`apps/api`의 docker-compose), **운영은 Supabase Postgres**(무료 티어로 시작) 예정. Vercel(서버리스라 NestJS 부적합)·AWS(운영 부담 과함)는 기각.

## Known Issues

* `User`의 레거시 필드 `cellName`/`teamId`(멤버십 전환 시 제거)와 `role`(권한 체계를 `isAdmin`+멤버십 역할로 전환 시 제거)이 남아 있다 ([docs/erd.md](docs/erd.md) 참고). `password`는 소셜 로그인 전환(2026-09-04)으로 제거됨.
* 로컬 `.env`의 `DATABASE_URL`이 Supabase를 가리키면 마이그레이션이 드리프트로 막힌다 — 로컬 개발은 Docker Postgres(`.env.example` 값)를 쓴다. Supabase에는 ERD 이전의 옛 임시 테이블이 남아 있어 운영 세팅 시 정리(리셋 또는 베이스라인)가 필요하다.
* **카카오 이메일 임시방편**: 이메일 동의항목이 심사 전이라 카카오 프로필에 이메일이 안 온다. 이메일이 없으면 `{provider}-{uid}@social.invalid` 형태의 임시 이메일로 가입시키고, 심사 통과 후 실제 이메일이 오면 재로그인 시점에 자동 교체된다 (`auth.service.ts`). 심사 통과·정식 앱 전환 후 이 임시방편 제거를 검토한다.

## Build Order

1. ~~Prisma 마이그레이션 실행~~ — **완료 (2026-09-02)**: 확정 ERD 전체(25개 모델)가 스키마로 전환·적용됨. 근거 문서는 [docs/erd.md](docs/erd.md)
2. 소셜 로그인 실제 연동 + Refresh token — **백엔드·모바일 배선 완료 (2026-09-05)**: 백엔드는 `/auth/login/kakao|google`(+인가 코드 교환)·`/auth/refresh`·`/auth/logout` + 인증 가드 2종, 모바일은 SecureStore 세션 복원·401 자동 refresh·로그인 버튼 → SDK → `signInWithSocial` 배선까지. 남은 것: dev build에서 종단 확인(키 등록은 apps/mobile/AGENTS.md "소셜 로그인 키"), 프로필 등록 API(`PATCH /users/me`) + `isNewUser` 분기, 마이페이지 로그아웃 배선
3. QR·셀 페이지 실제 기능 — 진입로(QR은 메인 헤더 버튼, 셀 페이지는 하단 탭)는 붙었지만 두 화면 다 제목만 있는 빈 화면이다. 특히 셀 페이지는 README 기준 기능 스코프가 아직 안 잡혀 있다
4. 팀 스토리/마이페이지/오늘 주보/말씀 화면 실제 디자인 반영 (Figma 나오는 대로)
5. 큐티나눔/기도요청 작성, 팀 게시판, 소그룹 모임 등 나머지 MVP 기능 모듈 (`posts`, `teams` 등) 추가
6. (향후 스코프) 유저 등급/어드민 — Access Model의 capability 확장
