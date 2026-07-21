# Contributing

이 저장소는 GitHub–Jira 연동을 두 단계로 자동화합니다.

1. **커밋**: 티켓키만 검증, 나머지 내용은 순수 git 기록용 (Jira에 자동으로 댓글이 달리지 않음). `#close` 마커만 예외적으로 Jira 티켓 완료 처리를 트리거함
2. **PR merge → Jira Description**: PR이 merge되면 PR 본문이 티켓 설명(Description)으로 반영됨 — 실제 작업 내용이 Jira에 남는 건 이 경로뿐

## 1. 커밋 메시지 규칙 (완료 처리 트리거)

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

### 작업 완료 표시

메시지 어디에든 완료 마커를 포함하면, 그 마커만 실제 Jira 전환 명령으로 바뀌고 나머지 내용은 그대로 유지됩니다. (정확한 마커/명령은 아래 자동 생성 구간 참고)

```
scrum-12: 세션 만료 처리 추가 #close
```

→ 커밋 시 `#close`만 `#done`으로 바뀌어 저장됨 (나머지 텍스트는 무변화). push되면 SCRUM-12 티켓이 완료 처리됩니다. 댓글은 여전히 달리지 않습니다 — 작업 요약이 Jira에 남길 원하면 PR 본문을 통해야 합니다 (아래 2번 참고).

### 티켓키 없이 커밋하면?

훅이 커밋을 거부합니다. 아래 형식 중 하나로 다시 작성해주세요.

```
[jira-smart-commit] 커밋 메시지 맨 앞에 Jira 티켓키가 있어야 합니다.
  예시: SCRUM-12: 내가 쓰고 싶은 내용 자유롭게 #close
```

머지 커밋(`Merge branch ...`)은 예외적으로 검증 없이 통과합니다.

## 2. PR 본문 → Jira Description 동기화

PR을 열 때 [PR 템플릿](.github/PULL_REQUEST_TEMPLATE.md)의 섹션을 채워주세요.

PR이 **merge되는 순간** GitHub Actions([.github/workflows/jira-description-sync.yml](.github/workflows/jira-description-sync.yml))가 실행되어, PR 본문의 섹션 내용을 Jira 티켓의 Description에 그대로 덮어씁니다. (기존 Description 내용은 대체됩니다 — 티켓을 처음부터 빈 카드로 만든다는 전제)

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

- 완료 마커나 실제 Jira 전환 명령을 바꾸려면 [scripts/git-hooks/jira-config.js](scripts/git-hooks/jira-config.js)를 수정하세요.
- PR → Description으로 옮겨지는 섹션 목록을 바꾸려면 [scripts/jira/sections-config.js](scripts/jira/sections-config.js)와 [PR 템플릿](.github/PULL_REQUEST_TEMPLATE.md)을 함께 수정하세요.
- 아래 구간은 위 설정 파일이 바뀌면 커밋할 때 **자동으로 다시 생성**됩니다 (`scripts/jira/generate-docs.js`, pre-commit 훅). 직접 수정하지 마세요.

<!-- AUTO-GENERATED:JIRA-CONFIG:START -->
<!-- 이 구간은 scripts/jira/generate-docs.js가 자동으로 생성합니다. 직접 수정하지 마세요. -->

- 완료 마커: `#close` (커밋 메시지 끝에 붙이면 실제 Jira 명령 `#done`로 변환됨)
- PR 본문 섹션 (Jira Description으로 그대로 반영됨):
- 개요
- 기능
- 작업 내용
- 완료 조건
<!-- AUTO-GENERATED:JIRA-CONFIG:END -->

## 훅 활성화

`pnpm install`을 실행하면 `prepare` 스크립트가 Husky 훅을 자동으로 설정합니다. 별도 작업은 필요 없습니다.
