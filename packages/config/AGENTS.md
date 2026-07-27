# AGENTS.md (packages/config)

`apps/*`가 공유하는 ESLint/Prettier/tsconfig 프리셋만 둔다. 특정 앱에만 필요한 규칙은 여기 넣지 않고 해당 앱 설정에서 개별 처리한다.

- `tsconfig.base.json` / `tsconfig.react-native.json` / `tsconfig.node.json` — 앱별 `tsconfig.json`이 `extends`로 상속.
- `eslint-preset.js`, `prettier.js` — 앱별 `.eslintrc`/prettier 설정이 상속.

**현재 상태**: `apps/mobile`, `apps/api` 둘 다 아직 이 프리셋을 `extends`하지 않고 각자 독립된 설정을 쓰고 있다 (실제 연결 안 됨). 연결 작업을 하게 되면 이 문서에 반영한다.
