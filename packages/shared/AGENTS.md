# AGENTS.md (packages/shared)

프론트(`apps/mobile`)·백(`apps/api`)이 같이 쓰는 타입/상수/유틸만 둔다. 한쪽에서만 쓰는 건 여기 두지 않고 해당 앱에 둔다.

## 추가할 때

- `src/types` / `src/constants` / `src/utils` 중 맞는 폴더에 추가하고 `src/index.ts`에 `export *`로 등록한다 (기존 파일들과 같은 패턴).
- 여기 정의한 타입은 계약이다 — 실제로 `apps/api`가 그 모양대로 응답하고 `apps/mobile`이 그 모양을 소비하는지 확인한다. 쓰는 곳 없이 "나중에 쓸 것 같아서" 타입만 먼저 만들어두지 않는다.
