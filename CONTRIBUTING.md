# Contributing

이 저장소는 GitHub–Jira 연동을 두 단계로 자동화합니다.

1. **커밋 push → 리뷰 대기**: 티켓키만 검증, 나머지 내용은 순수 git 기록용 (Jira에 자동으로 댓글이 달리지 않음). `#review` 마커만 예외적으로 티켓을 리뷰 대기 상태로 옮김
2. **PR merge → Description + 완료**: PR이 merge되면 PR 본문이 티켓 설명(Description)으로 반영되고, 이어서 티켓이 완료 처리됨 — 실제 작업 내용이 Jira에 남는 것도, 완료 처리가 일어나는 것도 이 경로뿐

**티켓을 완료로 보내는 커밋 마커는 없습니다.** 완료는 PR이 리뷰를 거쳐 merge될 때만 일어납니다.

## 0. 처음 한 번 설정 (팀원 각자)

클론한 뒤 아래 두 가지를 하지 않으면 자동화가 **조용히 동작하지 않습니다** — 에러가 안 나서 알아채기 어렵습니다.

### 훅 활성화

```bash
pnpm install
```

`prepare` 스크립트가 Husky 훅을 자동으로 설정합니다. 빠뜨리면 커밋 메시지 검증도 마커 치환도 전혀 동작하지 않습니다. 이미 클론해둔 경우에도 한 번 실행해주세요.

### 커밋 이메일을 Jira 계정 이메일로 맞추기

마커로 티켓 상태를 옮기려면 **커밋에 기록되는 이메일이 본인 Jira 계정 이메일과 정확히 일치**해야 합니다. Jira가 이 이메일로 "누가 이 명령을 내렸는지" 찾기 때문입니다. 일치하지 않으면 명령이 무시됩니다 — 경고도 없습니다.

```bash
git config user.email "본인의_Jira_계정_이메일"   # 이 저장소에만 적용
```

> 각자 **본인** Jira 계정 이메일을 넣으세요. 한 사람 이메일로 통일하면 모든 작업이 그 사람이 한 걸로 Jira에 기록됩니다.

GitHub 로그인 이메일과 달라도 됩니다 — 커밋 이메일과 계정 로그인은 별개입니다. 다만 GitHub이 커밋을 본인 계정에 연결하도록 하려면 GitHub → Settings → Emails 에서:

- 위 이메일을 **추가 등록 + 인증**
- **"Keep my email address private" 해제** — 켜져 있으면 커밋이 `...@users.noreply.github.com`으로 나가면서 위 설정이 무효가 됩니다

설정 후 `git log -1 --pretty="%ae"`로 본인 Jira 이메일이 찍히는지 확인하세요.

## 1. 커밋 메시지 규칙 (리뷰 요청 트리거)

커밋 메시지 맨 앞에 **Jira 티켓키**만 있으면 되고, 나머지 내용은 자유롭게 작성하면 됩니다. `commit-msg` 훅은 티켓키 존재 여부만 검증하고, 내용 자체를 Jira로 보내거나 변환하지 않습니다.

### 기본 형식

```
<티켓키>: <자유롭게 원하는 내용>
```

예시:

```
scrum-12: 로그인 세션 만료 버그 수정, 리프레시 토큰 로직 추가
```

이 메시지는 git 로그에 **그대로** 남습니다. Jira에는 아무 것도 전송되지 않습니다 (댓글도 안 달림).

### 리뷰 요청 표시

메시지 어디에든 리뷰 요청 마커를 포함하면, 그 마커만 실제 Jira 전환 명령으로 바뀌고 나머지 내용은 그대로 유지됩니다. (정확한 마커/명령은 아래 자동 생성 구간 참고)

```
scrum-12: 세션 만료 처리 추가 #review
```

→ 커밋 시 `#review`만 `#in-review`로 바뀌어 저장됨 (나머지 텍스트는 무변화). push되면 SCRUM-12 티켓이 리뷰 대기 상태로 이동합니다. **위 0번의 커밋 이메일 설정이 돼 있어야 동작합니다** — 이메일이 안 맞으면 아무 일도 일어나지 않고 경고도 없습니다.

댓글은 여전히 달리지 않습니다 — 작업 요약이 Jira에 남길 원하면 PR 본문을 통해야 합니다 (아래 2번 참고).

### 티켓키 없이 커밋하면?

훅이 커밋을 거부합니다. 아래 형식 중 하나로 다시 작성해주세요.

```
[jira-smart-commit] 커밋 메시지 맨 앞에 Jira 티켓키가 있어야 합니다.
  예시: SCRUM-12: 내가 쓰고 싶은 내용 자유롭게 #review
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

- 리뷰 요청 마커: `#review` (커밋 메시지에 붙이면 Jira 명령 `#in-review`로 변환되어, push 시 티켓이 리뷰 대기 상태로 이동)
- 완료 처리: 커밋 마커 없음 — PR이 merge될 때 `Done` 전환이 자동 실행됨
- PR 본문 섹션 (Jira Description으로 그대로 반영됨):
- 개요
- 기능
- 작업 내용
- 완료 조건
<!-- AUTO-GENERATED:JIRA-CONFIG:END -->
