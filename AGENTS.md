# AGENTS.md

이 저장소에서 AI로 작업할 때 지키는 규칙.

## 시작 전에 반드시 읽을 것

- 시스템 구조·아키텍처 결정: [ARCHITECTURE.md](ARCHITECTURE.md)
- `apps/mobile` UI 작업(화면/컴포넌트/스타일/네비게이션) 전: [apps/mobile/DESIGN.md](apps/mobile/DESIGN.md)
- 기획 의도·기능 스코프: [README.md](README.md)

이 문서들과 코드가 어긋나면, 코드를 임의로 고치지 말고 먼저 확인한다.

## 작업 태도

사소한 수정(오타, 한 줄 수정)까지 아래를 전부 지킬 필요는 없다 — 스스로 판단한다. 기능 추가나 여러 파일에 걸친 변경일수록 아래를 지킨다.

- **추측하지 않는다**: 불확실하면 진행하기 전에 먼저 묻는다. 해석이 여러 가지로 갈리면 하나를 조용히 골라 진행하지 말고 선택지를 제시한다. 더 간단한 방법이 보이면 먼저 말한다.
- **요청받은 만큼만 만든다**: 안 시킨 기능·유연성·설정 옵션·일어나지 않을 상황에 대한 에러 처리를 미리 만들지 않는다. 코드가 길어지고 있다면(50줄이면 될 걸 200줄로 짜고 있다면) 줄일 방법부터 찾는다.
- **손댄 곳만 고친다**: 요청과 무관한 인접 코드·포맷팅을 "겸사겸사" 고치지 않는다. 기존 스타일이 마음에 안 들어도 맞춘다. 내 변경으로 안 쓰게 된 import/변수만 지우고, 원래 있던 죽은 코드는 지우지 말고 언급만 한다.
- **검증 가능한 목표로 바꿔서 확인한다**: "고쳐줘"를 "이 상황을 재현 → 통과시키기"처럼 확인 가능한 조건으로 바꿔 작업한다. 여러 단계짜리 작업이면 단계마다 확인 방법을 같이 적어둔다. (검증의 깊이는 아래 "검증 기준" 참고.)

## 패키지 매니저

pnpm만 쓴다. npm/yarn 명령어를 쓰지 않는다 (이유는 ARCHITECTURE.md 참고).

- 특정 워크스페이스 명령 실행: `pnpm --filter <package-name> <command>` (예: `pnpm --filter @onnuri/mobile exec expo start`)
- 전체 워크스페이스에 존재하는 스크립트만 실행: `pnpm -r --if-present run <script>`
- 새 의존성 설치: `pnpm --filter <package-name> add <pkg>` / Expo 네이티브 모듈은 `pnpm --filter @onnuri/mobile exec expo install <pkg>`

## 시작하기

처음 클론한 뒤의 순서.

1. 루트에서 `pnpm install` (전체 워크스페이스 한 번에 설치됨)
2. **커밋 이메일 확인**: `git config user.email`이 본인 Jira 계정 이메일과 일치해야 한다 — 다르면 커밋의 `#review` 마커가 아무 경고 없이 무시된다. 다르면 `git config user.email "<본인 Jira 계정 이메일>"`로 이 저장소에만 설정한다 (전역 설정은 건드리지 않는다). 자세한 배경은 [CONTRIBUTING.md](CONTRIBUTING.md).
3. **모바일 작업**: 바로 `pnpm --filter @onnuri/mobile exec expo start`로 시작 가능 (DB 불필요)
4. **API 작업**:
   1. `apps/api/.env.example`을 복사해 `apps/api/.env` 생성 후 값 채우기
   2. 로컬 Postgres 준비 — **아직 팀 차원에서 정해진 방법이 없음** (지금은 프론트 작업이 우선이라 보류 중. API 작업 착수 전 담당자가 방법을 정하고 이 항목을 갱신할 것)
   3. `pnpm --filter @onnuri/api run prisma:migrate`
   4. `pnpm --filter @onnuri/api run prisma:generate`
   5. `pnpm --filter @onnuri/api run start:dev`

## 자주 쓰는 명령

| 목적 | 명령 |
|---|---|
| 모바일 개발 서버 | `pnpm --filter @onnuri/mobile exec expo start` |
| 모바일 타입체크 | `pnpm --filter @onnuri/mobile exec tsc --noEmit` |
| API 개발 서버 | `pnpm --filter @onnuri/api run start:dev` |
| API 빌드 / 린트 | `pnpm --filter @onnuri/api run build` / `run lint` |
| Prisma 마이그레이션 적용 | `pnpm --filter @onnuri/api run prisma:migrate` |
| Prisma 클라이언트 생성 | `pnpm --filter @onnuri/api run prisma:generate` |

## 검증 기준

- **화면/컴포넌트** (`apps/mobile/src/features/*`, `apps/mobile/src/shared/components/*`): 타입체크 통과, 콘솔 에러 없음 정도면 충분하다. 브라우저에서 클릭해가며 실제 동작까지 깊게 검증할 필요 없다 — 어차피 팀이 다시 손댈 스캐폴드다.
- **로직/인프라** (인증 가드, API 클라이언트, babel/metro/tailwind 설정 등): 실제로 동작하는지 확인한다. 여기서 생긴 버그는 나중에 찾기 어렵다.

## PR 열기

PR은 사람이 GitHub UI에서 직접 열지 말고 AI에게 요청한다 — PR 본문 4개 섹션이 그대로 Jira Description이 되므로, 비어 있으면 Jira에 작업 기록이 아무것도 안 남는다 (자세한 동작은 [CONTRIBUTING.md](CONTRIBUTING.md)).

1. `docs/exec-plans/<티켓키>-*.md`가 있으면 그 문서(개요/작업 계획/진행 로그/완료 조건)를 근거로 채운다. 없으면 base 브랜치와의 diff·커밋 메시지에서 뽑는다.
2. [PR 템플릿](.github/PULL_REQUEST_TEMPLATE.md)의 4개 섹션(개요/기능/작업 내용/완료 조건)을 모두 채운다. 빈 섹션은 Jira에 "(작성되지 않음)"으로 박히므로 남기지 않는다.
3. 코드에 드러나지 않는 것(왜 이 작업을 하는지, 무엇을 확인해야 끝인지)은 추측해서 쓰지 말고 묻는다.
4. `gh pr create`로 올린다. PR 제목 맨 앞에 티켓키를 붙인다.

## 문서 갱신

컨벤션이 바뀌면 코드와 같은 턴에 ARCHITECTURE.md/DESIGN.md도 갱신한다. 같은 규칙을 두 문서에 중복 적지 않는다 — 이미 한쪽에 있으면 다른 쪽에서는 링크만 건다.
