# AGENTS.md (apps/mobile)

프론트엔드(Expo/React Native) 작업 전용 규칙. 공통 규칙은 루트 [AGENTS.md](../../AGENTS.md), 시스템 구조는 [ARCHITECTURE.md](../../ARCHITECTURE.md)를 먼저 본다.

## 소셜 로그인 키

- `.env` 값(`EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`)은 **Jira 문서**에 있다 — [.env.example](.env.example) 참고.
- **빌드 키 등록**: 소셜 로그인은 서명 키가 카카오/구글 콘솔에 등록된 빌드에서만 동작한다. 조직 프로젝트 키스토어의 SHA-1·키 해시 값을 **한재민에게 보내면 콘솔에 등록해준다** (조직 키스토어는 하나라 한 번만 등록하면 된다). 미등록이면 구글은 `DEVELOPER_ERROR`, 카카오는 키 해시 오류가 난다.
- 두 SDK 다 네이티브 모듈이라 **Expo Go·웹에서는 소셜 로그인이 동작하지 않는다** (dev build 필요). 웹/Expo Go에서는 게스트로 화면 작업만 한다.
- 카카오 config plugin은 **빌드 시점**에 키를 읽으므로, 빌드하는 환경에도 `EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY`가 설정돼 있어야 한다.

## EAS 빌드

프로필은 [eas.json](eas.json)에 있다 — `development`(dev client·APK), `preview`(내부 배포용 APK), `production`(AAB). 실행은 `pnpm --filter @onnuri/mobile exec eas <command>`.

**빌드는 공용 조직 계정 `onnuri-church-app`의 프로젝트 `onnuri-app`으로 나간다.** 계정을 공유하지 않고, 각자 자기 Expo 계정으로 로그인한 채 조직 멤버(Developer 이상)로 참여한다.

- 계정 연결값(`owner`, `extra.eas.projectId`)은 `eas init`이 **`app.json`에 직접 쓴다**. `.env`로 빼는 건 안 된다 — EAS CLI는 `.env`를 읽지 않아서 "EAS project not configured"로 빌드가 죽는다 (Expo CLI는 읽으므로 `expo config`만으로 검증하면 못 잡는다).
- 이 두 값은 **커밋한다**. 팀 전체가 같은 조직 프로젝트를 보게 하려는 것이므로, 개인 계정 값으로 덮어쓰지 않는다.
- `app.json`의 `slug`는 EAS 프로젝트 slug(`onnuri-app`)와 같아야 한다. 다르면 `eas init`이 다른 프로젝트를 찾거나 새로 만든다.
- **키스토어는 조직 계정에 하나만 둔다.** 조직 프로젝트로 빌드하면 누가 돌리든 같은 SHA-1이 나오므로, 위 "소셜 로그인 키"의 콘솔 등록도 한 번만 하면 된다. (`*.jks`는 gitignore 대상이라 저장소에 넣지 않는다.)

## UI 작업 전 필수

화면/컴포넌트/스타일/네비게이션을 건드리기 전에 [DESIGN.md](DESIGN.md)를 읽는다 — 컬러·사이즈 토큰, 컴포넌트 props 규칙, 네비게이션 구조가 여기 정의돼 있다.

## 남의 작업은 건드리지 않는다

UI 작업 중 다른 사람이 쓴 코드가 DESIGN.md 규칙을 어기고 있어도 고치지 않는다 — Tailwind 기본 `text-sm`을 써서 타입 스케일이 안 맞더라도 그대로 둔다. 이번에 내가 손댄 곳만 규칙을 지킨다. 눈에 띄면 고치지 말고 말로만 알린다. (루트 [AGENTS.md](../../AGENTS.md) "손댄 곳만 고친다"의 UI 버전.)

## export 규칙

**컴포넌트·화면·네비게이터는 named export만 쓴다** ( `export function Chip()`). `export default`는 쓰지 않는다. 훅·스토어·API 클라이언트 등 UI가 아닌 코드도 마찬가지다.

* 컴포넌트 중 유일한 예외는 진입점 `App.tsx` — `registerRootComponent`가 받는 루트 컴포넌트라 default export를 유지한다.
* import도 이름을 그대로 쓴다: `import { HomeScreen } from "../features/home/HomeScreen"`. 별칭을 붙이지 않는다.
* 이유: default export는 import 쪽 이름이 임의라 원본 이름을 바꿔도 조용히 어긋나고, 오타(`HomeScren`)도 타입 에러가 안 난다. named면 rename 리팩터링이 import 사이트까지 따라오고 오타는 즉시 잡힌다.
* Expo/RN 템플릿과 문서 예제는 대부분 `export default function`이라 복붙하면 섞이기 쉽다. 새 파일을 만들 때 확인한다. (이 프로젝트는 expo-router를 쓰지 않으므로 default export를 강제하는 파일이 없다.)

## 이벤트 핸들러 네이밍 규칙

props(인터페이스)와 내부 함수(구현)의 이름을 구분한다. 연결부는 `onPress={handleCardPress}`처럼 "자리 = 꽂는 함수"로 읽힌다.

* **콜백 props는 `on<이벤트>`** — `onPress`, `onSelect`, `onSubmit`. RN 기본 컴포넌트(`Pressable`의 `onPress` 등)와 같은 관례다. 같은 종류의 이벤트가 둘 이상이면 대상을 붙인다 (`onLikePress`, `onCommentSubmit`).
* **내부 구현 함수는 `handle<대상><이벤트>`** — `handleWritePress`, `handleLikePress`, `handleCommentSubmit`. 대상 생략(`handlePress`)은 그 이벤트가 화면에 하나뿐일 때만 허용한다.
* **내부 함수 이름에 `on*`을 쓰지 않는다** — props로 받은 것인지 지역에서 만든 것인지 읽을 때마다 헷갈린다.

## 타입체크

`pnpm --filter @onnuri/mobile exec tsc --noEmit`로 확인한다. `package.json`에 스크립트가 없어서 이 명령을 직접 쓴다.

## Expo 버전 주의

Expo `~57.0.7`을 쓴다. 최근 버전이라 학습 데이터에 없는 API 변경이 있을 수 있다 — 확신 없는 Expo API는 https://docs.expo.dev/versions/v57.0.0/ 에서 버전에 맞는 문서를 확인하고 쓴다.
