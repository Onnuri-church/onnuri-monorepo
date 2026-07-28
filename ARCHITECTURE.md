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

* 환경변수는 부팅 시 `config/env.validation.ts`가 검증한다. 코드에 기본값을 두지 않으므로 `.env`가 단일 소스다.
* 환경변수는 `ConfigService`를 쓴다. `env()`는 검증 결과를 `configuration.ts`로 넘기는 다리라 호출처는 그 파일 하나뿐이다.
* 점 표기에는 `{ infer: true }`가 필요하다 — `config.get('jwt.accessSecret', { infer: true })`.

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
│   ├── auth/      register/login, JWT 발급 (strategies/jwt.strategy.ts)
│   └── users/     findByEmail/findById(비밀번호 제외 select), GET /users/me
└── common/
    ├── guards/    JwtAuthGuard (auth/users 모듈 간 순환참조 피하려고 common에 둠)
    ├── decorators/ CurrentUser
    ├── filters/   (비어있음)
    └── interceptors/ (비어있음)
```

스택: NestJS `^11.0.1`, PostgreSQL + Prisma **`^6.19.3`로 고정**(최신 7.x는 ESM 전용 + driver adapter 필수라 CommonJS 기반 Nest 스캐폴딩과 충돌해서 다운그레이드), `@nestjs/jwt` + `passport-jwt`, 비밀번호는 `bcryptjs` 해싱.

## Frontend Module Shape

기능(화면) 하나는 기본적으로 파일 하나다. 관련 파일(로컬 훅, 서브 컴포넌트)이 실제로 필요해지기 전까지 미리 폴더를 안 쪼갠다.

```
features/<name>/
  <Name>Screen.tsx   # 화면 컴포넌트. 필요해지면 같은 폴더에 파일 추가(폴더 미리 안 만듦)
```

```
apps/mobile/src/
├── features/       auth/ bulletin/ home/ live/ my-page/ qt-board/ sermon/ team-story/
├── navigation/     RootNavigator(인증 분기 Stack), BottomTabNavigator
└── shared/
    ├── api/        axios client (요청 인터셉터: 토큰 첨부 / 응답 인터셉터: 401 처리)
    ├── components/ 공용 UI 컴포넌트 (Header, Skeleton 등) — 파일별 폴더 안 만들고 flat
    ├── store/      Zustand (useAuthStore: user, accessToken)
    ├── theme/      tokens.js(컬러·타입스케일 단일 소스), fonts.ts(폰트 로딩용 require 맵)
    ├── types/      navigation.ts (RootStackParamList, RootTabParamList, AuthStackParamList)
    └── hooks/      (아직 비어있음)
```

스택: Expo `~57.0.7` / React Native `0.86.0`, NativeWind `^4.2.6` + Tailwind `^3.4.19`(규칙은 DESIGN.md), `@react-navigation`(Native Stack + Bottom Tabs), Zustand `^5.0.14`, TanStack Query + Axios, Pretendard 폰트, `@gorhom/bottom-sheet`(+ reanimated/gesture-handler/worklets), 미디어는 `expo-av`/`react-native-image-zoom-viewer`/`react-native-webview`.

## Access Model

지금은 단일 등급이다: **`Guest`**(비인증) vs **`User`**(JWT 인증 완료). `Partner`/`Admin` 같은 별도 등급은 아직 없다 — README의 "임원 회의 사항"(유저 등급, 어드민 계정)은 향후 스코프이며 지금 코드에 반영돼 있지 않다.

```
@UseGuards(JwtAuthGuard)   # users.controller.ts의 /users/me 등
```

* 모든 화면이 로그인을 요구한다 (예외 없음). 세션 체크는 개별 화면이 아니라 `RootNavigator`가 `accessToken` 유무로 트리 전체를 분기해서 처리한다.
  * 세션 있음 → `Stack`(`Main`(BottomTabNavigator) + `QtBoard` + `Live`)
  * 세션 없음 → `AuthStack`(`Login`만)
* API가 401을 주면 `shared/api/client.ts`의 응답 인터셉터가 Alert → 확인 누르면 `clearSession()` → `accessToken`이 null이 되는 순간 자동으로 로그인 화면 전환 (별도 네비게이션 호출 없음).
* 유저 등급이 추가되면(향후) capability 기반 가드 조합(`@UseGuards(AuthGuard, XGuard)`)으로 확장하고, 리소스 소유권 검증(예: 내 글만 수정 가능)을 role 체크와 별도로 반드시 추가한다.

## Known Issues

* Prisma 스키마(`User`/`Team`/`Post`)는 정의만 됐고 마이그레이션은 아직 실행 안 함 — 로컬 Postgres 연결 전까지 DB를 쓰는 API 호출은 실패한다.

## Build Order

1. Prisma 마이그레이션 실행 (로컬 Postgres 연결) — 없으면 auth/users API가 실제로 안 돌아감
2. 로그인 화면 실제 폼 구현 (지금은 placeholder) + Refresh token
3. 하단 탭 아이콘 라이브러리 결정 및 적용 (디자이너 확인 대기)
4. 팀 스토리/마이페이지/오늘 주보/말씀 화면 실제 디자인 반영 (Figma 나오는 대로)
5. 큐티나눔/기도요청 작성, 팀 게시판, 소그룹 모임 등 나머지 MVP 기능 모듈 (`posts`, `teams` 등) 추가
6. (향후 스코프) 유저 등급/어드민 — Access Model의 capability 확장
