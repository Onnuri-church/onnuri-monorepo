# Contributing

이 저장소는 GitHub–Jira 연동을 두 단계로 자동화합니다.

1. **커밋 push → 리뷰 대기**: 제목의 티켓키·타입 형식만 검증, 나머지 내용은 순수 git 기록용 (Jira에 자동으로 댓글이 달리지 않음). `#review` 마커만 예외적으로 티켓을 리뷰 대기 상태로 옮김
2. **PR merge → Description + 완료**: PR이 merge되면 PR 본문이 티켓 설명(Description)으로 반영되고, 이어서 티켓이 완료 처리됨 — 실제 작업 내용이 Jira에 남는 것도, 완료 처리가 일어나는 것도 이 경로뿐

**티켓을 완료로 보내는 커밋 마커는 없습니다.** 완료는 PR이 리뷰를 거쳐 merge될 때만 일어납니다.

## 0. 처음 한 번 설정 (팀원 각자)

**이 4가지를 안 하면 자동화가 조용히 동작하지 않습니다.** 에러가 안 나기 때문에 "왜 Jira가 안 움직이지?" 하고 한참 헤매게 됩니다.

| | 할 일 | 안 하면 |
| --- | --- | --- |
| ① | `pnpm install` | 커밋 검증·마커 치환이 전혀 안 됨 |
| ② | 커밋 이메일을 본인 **Jira 계정 이메일**로 설정 | `#review` 마커가 무시됨 |
| ③ | 그 이메일을 본인 **GitHub 계정**에 등록·인증 | 커밋이 남의 계정으로 표시되거나 아무에게도 안 붙음 |
| ④ | `gh auth login` | AI가 PR을 못 엶 |

### ① 훅 활성화

```bash
pnpm install
```

`prepare` 스크립트가 Husky 훅을 설정합니다. 이미 클론해둔 경우에도 한 번 실행해주세요.

### ② 커밋 이메일을 Jira 계정 이메일로 맞추기

Jira는 **커밋에 기록된 이메일**로 "누가 이 명령을 내렸는지"를 찾습니다. 일치하는 Jira 계정이 없으면 마커를 조용히 버립니다.

```bash
git config user.email "본인의_Jira_계정_이메일"   # 이 저장소에만 적용
```

> 각자 **본인** Jira 계정 이메일을 넣으세요. 한 사람 이메일로 통일하면 모든 작업이 그 사람이 한 걸로 Jira에 기록됩니다.

전역 설정(`--global`)은 건드리지 않습니다. 다른 프로젝트에서 쓰는 이메일은 그대로 둡니다.

### ③ 그 이메일을 본인 GitHub 계정에 등록

②까지만 하면 Jira는 동작하지만, GitHub이 그 커밋을 누구 것인지 몰라 **프로필에 안 잡히거나 엉뚱한 계정으로 붙습니다.**

GitHub → Settings → Emails → **Add email address** → 인증메일 확인.

Primary로 지정할 필요는 없습니다. 추가 이메일로 등록·인증만 되면 됩니다. 로그인 이메일과 달라도 상관없습니다.

> ⚠️ **이미 다른 GitHub 계정에서 인증된 이메일이면 등록이 안 됩니다.** 하나의 이메일은 한 계정에서만 인증될 수 있습니다. 추가는 되지만 `Unverified`에서 멈추므로, 예전 계정에서 **먼저 삭제**한 뒤 다시 인증하세요. (그 이메일이 예전 계정의 Primary면, 다른 이메일을 Primary로 바꿔야 삭제됩니다.)

등록·인증이 끝나면 **이미 올라간 커밋도 소급해서** 본인 계정으로 바뀝니다. 커밋을 다시 만들 필요 없습니다.

### ④ GitHub CLI 로그인

```bash
gh auth login
```

PR은 AI에게 요청해서 여는 것이 이 저장소의 규칙이라(루트 [AGENTS.md](AGENTS.md) "PR 열기") `gh pr create`가 쓰입니다. 인증 방식은 **Login with a web browser**가 가장 간단합니다.

토큰으로 로그인한다면 스코프에 **`workflow`를 반드시 포함**하세요. 없으면 `.github/workflows/` 변경이 포함된 푸시가 거부됩니다.

### 설정 확인

```bash
git config user.email      # 본인 Jira 계정 이메일이 나와야 함
gh auth status             # 본인 GitHub 계정으로 로그인돼 있어야 함
ls .husky                  # commit-msg, pre-commit 이 있어야 함
```

첫 커밋 후에는 `git log -1 --pretty="%ae"`로도 확인할 수 있습니다.

### 잘 안 될 때

| 증상 | 원인 |
| --- | --- |
| 커밋이 그냥 통과됨 (형식 검증 안 함) | ① 안 함 — `pnpm install` |
| 커밋은 되는데 Jira 티켓이 안 움직임 | ② 이메일 불일치. `git config user.email`과 Jira 계정 이메일을 비교 |
| GitHub에서 커밋이 모르는 계정으로 표시됨 | ③ 그 이메일이 다른 GitHub 계정에 인증돼 있음 |
| 커밋에 프로필 사진이 없고 계정 링크가 없음 | ③ 어느 계정에도 등록 안 됨 |
| PR merge했는데 Jira Description이 비어 있음 | PR 본문을 안 채운 것 — 4개 섹션을 채워야 합니다 |
| PR merge했는데 완료 처리가 안 됨 | 머지 후 30초쯤 걸립니다. 그 후에도 안 되면 Actions 로그 확인 |

### 저장소 관리자만 하는 것

팀원은 신경 쓰지 않아도 됩니다. 아래 [필요한 GitHub Secrets](#필요한-github-secrets) 3개가 저장소에 등록돼 있어야 PR merge 자동화가 동작합니다.

## 1. 커밋 메시지 규칙 (리뷰 요청 트리거)

커밋 제목은 **티켓키 + 타입**으로 시작하고, 그 뒤 내용은 자유롭게 작성하면 됩니다. `commit-msg` 훅은 이 형식만 검증하고, 내용 자체를 Jira로 보내거나 변환하지 않습니다.

### 기본 형식

```
<티켓키> <타입>: <자유롭게 원하는 내용>
```

예시:

```
scrum-12 fix: 로그인 세션 만료 버그 수정, 리프레시 토큰 로직 추가
```

### 타입

| 타입 | 설명 |
| --- | --- |
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `docs` | 문서 수정 (코드 변경 없음) |
| `style` | 코드 포맷팅, 세미콜론 등 스타일 변경 (논리 변경 없음) |
| `refactor` | 리팩터링 (기능 변화 없음) |
| `test` | 테스트 관련 코드 추가/수정 |
| `chore` | 빌드, 패키지 매니저 설정 등 기타 작업 |
| `design` | CSS 등 사용자 UI 디자인 변경 |
| `comment` | 필요한 주석 추가 및 변경 |
| `rename` | 파일 혹은 폴더명을 수정하거나 옮기는 작업만인 경우 |
| `remove` | 파일을 삭제하는 작업만 수행한 경우 |
| `!HOTFIX` | 급하게 치명적인 버그를 고쳐야 하는 경우 |

**표기 그대로만 통과합니다.** `Feat`, `FIX`처럼 대소문자가 다르면 커밋이 거부됩니다 — git log 모양을 일정하게 유지하는 게 이 규칙의 목적입니다.

이 메시지는 git 로그에 **그대로** 남습니다. Jira에는 아무 것도 전송되지 않습니다 (댓글도 안 달림).

### 리뷰 요청 표시

메시지 어디에든 리뷰 요청 마커를 포함하면, 그 마커만 실제 Jira 전환 명령으로 바뀌고 나머지 내용은 그대로 유지됩니다. (정확한 마커/명령은 아래 자동 생성 구간 참고)

```
scrum-12 feat: 세션 만료 처리 추가 #review
```

→ 커밋 시 `#review`만 `#in-review`로 바뀌어 저장됨 (나머지 텍스트는 무변화). push되면 SCRUM-12 티켓이 리뷰 대기 상태로 이동합니다. **위 0번의 커밋 이메일 설정이 돼 있어야 동작합니다** — 이메일이 안 맞으면 아무 일도 일어나지 않고 경고도 없습니다.

댓글은 여전히 달리지 않습니다 — 작업 요약이 Jira에 남길 원하면 PR 본문을 통해야 합니다 (아래 2번 참고).

### 형식이 틀리면?

훅이 커밋을 거부하고 사용 가능한 타입을 함께 출력합니다.

```
[jira-smart-commit] 커밋 제목 형식이 맞지 않습니다.
  형식: <티켓키> <타입>: <내용>
  예시: SCRUM-12 feat: 로그인 세션 만료 처리 추가 #review
  타입: feat, fix, docs, style, refactor, test, chore, design, comment, rename, remove, !HOTFIX
```

머지 커밋(`Merge branch ...`)은 예외적으로 검증 없이 통과합니다.

## 2. PR merge → Description 동기화 + 완료 처리

PR을 열 때 [PR 템플릿](.github/PULL_REQUEST_TEMPLATE.md)의 섹션을 채워주세요.

PR이 **merge되는 순간** GitHub Actions([.github/workflows/jira-description-sync.yml](.github/workflows/jira-description-sync.yml))가 실행되어 순서대로 두 가지를 합니다.

1. PR 본문의 섹션 내용을 Jira 티켓의 Description에 그대로 덮어씀 (기존 Description 내용은 대체됩니다 — 티켓을 처음부터 빈 카드로 만든다는 전제)
2. 티켓을 완료 상태로 전환 ([scripts/jira/transition-issues.js](scripts/jira/transition-issues.js))

merge가 아니라 **그냥 닫기만 하면 둘 다 실행되지 않습니다.**

전환은 GitHub Actions가 `JIRA_EMAIL` 계정 권한으로 실행하므로, 누가 merge하든 Jira 이력에는 그 계정이 완료 처리한 것으로 남습니다. 완료 전환 이름이 워크플로우와 맞지 않으면 Actions 로그에 **현재 상태에서 가능한 전환 목록**이 함께 출력되니, 그걸 보고 [jira-config.js](scripts/git-hooks/jira-config.js)의 `doneTransitionName`을 맞추면 됩니다.

### 어떤 티켓에 반영되는지

**PR 제목 + PR에 포함된 모든 커밋 메시지**에서 티켓키를 전부 찾아서, 찾은 티켓 전부에 동일한 내용을 반영합니다. 그래서 커밋 3개가 각각 다른 티켓키(SCRUM-12, SCRUM-13, SCRUM-14)를 가리켜도 하나의 PR로 올리면 세 티켓 모두 Description이 채워집니다. PR 제목에 티켓키를 안 넣어도, 커밋 메시지에만 있으면 인식됩니다.

### 필요한 GitHub Secrets

리포지토리 관리자가 아래 값을 GitHub Secrets에 등록해야 동작합니다.

| Secret | 값 |
| --- | --- |
| `JIRA_BASE_URL` | 예: `https://yourteam.atlassian.net` |
| `JIRA_EMAIL` | API 토큰을 발급한 Jira 계정 이메일 |
| `JIRA_API_TOKEN` | [id.atlassian.com](https://id.atlassian.com/manage-profile/security/api-tokens)에서 발급 |

## 설정 변경

- 리뷰 요청 마커, 리뷰 전환 명령(`reviewCommand`), 완료 전환 이름(`doneTransitionName`)을 바꾸려면 [scripts/git-hooks/jira-config.js](scripts/git-hooks/jira-config.js)를 수정하세요.
- PR → Description으로 옮겨지는 섹션 목록을 바꾸려면 [scripts/jira/sections-config.js](scripts/jira/sections-config.js)와 [PR 템플릿](.github/PULL_REQUEST_TEMPLATE.md)을 함께 수정하세요.
- 아래 구간은 위 설정 파일이 바뀌면 커밋할 때 **자동으로 다시 생성**됩니다 (`scripts/jira/generate-docs.js`, pre-commit 훅). 직접 수정하지 마세요.

<!-- AUTO-GENERATED:JIRA-CONFIG:START -->
<!-- 이 구간은 scripts/jira/generate-docs.js가 자동으로 생성합니다. 직접 수정하지 마세요. -->

- 커밋 제목 형식: `<티켓키> <타입>: <내용>` (예: `SCRUM-12 feat: 로그인 세션 만료 처리 추가`)
- 사용 가능한 타입 (표기 그대로만 통과): `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `design`, `comment`, `rename`, `remove`, `!HOTFIX`
- 리뷰 요청 마커: `#review` (커밋 메시지에 붙이면 Jira 명령 `#in-review`로 변환되어, push 시 티켓이 리뷰 대기 상태로 이동)
- 완료 처리: 커밋 마커 없음 — PR이 merge될 때 `완료` 전환이 자동 실행됨
- PR 본문 섹션 (Jira Description으로 그대로 반영됨):
- 개요
- 기능
- 작업 내용
- 완료 조건
<!-- AUTO-GENERATED:JIRA-CONFIG:END -->
