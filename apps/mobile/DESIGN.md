# DESIGN.md (React Native / Expo)

UI 작업 전 반드시 읽는다. 이 문서와 코드가 어긋나면 멈추고 확인한다. 규칙이 바뀌면 이 문서도 함께 갱신한다.

스택 전제: React Native (Expo), NativeWind(Tailwind), React Navigation (Stack + Bottom Tab), Zustand.

## 컬러 규칙

* semantic 토큰만 사용한다 (primitive 원시 스케일은 두지 않기로 확정). 그 외는 사용 금지.
* 원시 hex, 정의되지 않은 Tailwind 기본 팔레트는 사용하지 않는다.
* 토큰은 `tailwind.config.js` theme(`colors`, extend 아님)에 등록된 것만 인정한다 — 등록 안 된 색은 클래스 자체가 존재하지 않는다.
* 추측하지 않는다. semantic 토큰에 없으면 코딩을 멈추고 작업자(디자인: 남현지)에게 요청한다.

## 사이즈·간격 규칙

* 컬러를 제외한 sizing / gap / padding / radius는 Tailwind 기본 스케일만 쓴다.
* 커스텀 토큰을 만들지 않는다. arbitrary value도 쓰지 않는다.
* 스펙이 기본 스케일에 맞지 않으면 작업자에게 확인한다. (디바이스 픽셀 이슈로 예외가 필요해 보여도 임의로 처리하지 않는다.)
* 주보 이미지 뷰어, 영상 플레이어처럼 콘텐츠 비율에 종속되는 영역(예: 16:9, 원본 이미지 비율)은 사이즈 토큰이 아니라 `aspectRatio`로 처리하고 별도 확인 없이 진행 가능.

## 컴포넌트 props 규칙

Figma variant property를 기준으로 props를 설계하되 두 가지를 구분한다.

* `style`, `type`, `size` 같은 디자인 선택값 → props
* `hover`, `active`, `focus`, `pressed` 같은 상호작용 상태 → props 금지

RN에는 CSS state variant(`hover:` 등)가 없다. 상호작용 상태는 다음으로만 처리한다.

* 눌림 상태: `Pressable`의 `style={({ pressed }) => ...}` 콜백 (별도 `isPressed` prop 만들지 않음)
* 비활성 상태: `disabled`는 RN 컴포넌트가 실제로 받는 prop으로 그대로 전달 (커스텀 wrapper에서 스타일 로직으로 재구현하지 않음)
* `hover`, `focus`는 터치 디바이스 특성상 기본적으로 다루지 않는다. 필요한 화면(태블릿 등 포인터 입력)에 한해 별도 확인 후 정의.

## 작업 시작 조건

아래가 모두 확보되지 않으면 코딩을 시작하지 않는다.

* [ ] variant 각 축의 정확한 enum 값
* [ ] size별 height / padding / gap / radius
* [ ] 상태별(pressed·disabled 등) 컬러 토큰 규칙

## 레이아웃 · 내비게이션 규칙

* 앱 루트는 `SafeAreaProvider` → `SafeAreaView`. 웹처럼 `max-w` / 데스크톱 중앙 정렬 개념 없음 — 네이티브 앱은 항상 디바이스 전체 화면.
* Safe area는 `react-native-safe-area-context`의 `useSafeAreaInsets()`로 처리한다. `.pt-safe`/`.pb-safe` 같은 CSS 유틸은 RN에 없음 — Header/BottomNav 컴포넌트가 각자 insets 값을 받아 padding으로 적용.
* 내비게이션 구조: 루트 `Stack.Navigator` 안에 `Tab.Navigator`(메인 탭, BottomNav 포함)를 하나의 스크린으로 넣고, 그 외 화면은 루트 Stack에 push한다.
  * 메인 탭(`Tab.Navigator` 직접 등록, BottomNav 노출, Figma 확정): 홈 · 팀 스토리 · 말씀(가운데, 탭바 위로 튀어나온 원형 버튼) · 오늘 주보 · 마이페이지
  * 큐티나눔·실시간예배는 하단 탭이 아니라 **홈 화면에서 진입하는 화면**이다 — 루트 `Stack.Navigator`에 등록해서 홈에서 push한다.
  * 서브(루트/각 탭 내부 `Stack`에서 push, BottomNav 없음): 위 큐티나눔·실시간예배 외에 말씀 영상 상세, 주보 상세, 큐티나눔 작성, 기도요청 작성/상세, 팀 게시판 상세, 소그룹 모임 상세, 로그인/회원가입 등
  * 웹 버전의 `(main)/`, `(sub)` route group 구분과 동일한 개념을 폴더 대신 Navigator 등록 위치로 표현.
* BottomNav 활성 탭은 React Navigation이 관리하는 상태(`useNavigationState` 또는 tab navigator의 `focused` prop)로 결정한다. Zustand로 별도 복제하지 않는다 — Zustand는 이 프로젝트에서 다른 전역 상태(로그인 세션, 유저 프로필 등)에는 쓰되, 내비게이션이 이미 소유한 상태를 중복 관리하지 않는다는 원칙은 유지.
* Header는 `shared/components/Header.tsx`에 구현, 두 variant로 나뉜다 (Figma 확정):
  * `variant="main"` — 메인 탭 5개 화면에 공통 적용. 로고+앱 이름("ONNURI YOUTH")+서브텍스트, 우측에 알림·설정 버튼. `BottomTabNavigator`의 `screenOptions.header`로 적용.
  * `variant="sub"` — 탭 밖에서 push되는 화면용. 뒤로가기, 가운데 타이틀, 우측 더보기(⋮) 버튼. `RootNavigator`의 각 `Stack.Screen options.header`로 적용 (반드시 `headerShown: true`도 같이 줘야 렌더링됨 — `headerShown: false`가 있으면 `header` 함수를 줘도 아예 안 그려짐).
  * 아이콘 라이브러리 미정이라 알림/설정/뒤로가기/더보기는 전부 텍스트/기호로 임시 대체 중.
* **모든 화면이 로그인을 요구한다** (예외 없음). `RootNavigator`가 `useAuthStore`의 `accessToken` 유무로 트리 전체를 분기한다 — 세션 있으면 `Main`(탭)+`QtBoard`+`Live`가 있는 스택, 없으면 `Login`만 있는 `AuthStack`. 개별 화면에서 세션 체크 후 조건부 push하지 않는다.
* 오버레이(Toast · Modal · BottomSheet)는 `@gorhom/bottom-sheet` 하나로 통일한다. 바텀시트는 `BottomSheet`/`BottomSheetModal`, 일반 모달·Toast도 별도 라이브러리 없이 같은 패키지의 `BottomSheetModal`로 화면 최상위 네이티브 레이어에 띄운다. `AppToast` · `AppModal` · `AppSheet`(`src/shared/components/`에 위치)는 store 구독과 애니메이션 트리거만 담당하고, 내부 렌더링은 `BottomSheetModal`에 위임한다 (웹처럼 컨테이너 안 절대 위치로 직접 쌓지 않음).
* OTA 업데이트(Expo EAS Update)로 UI 수정 배포 시 스토어 심사 없이 반영 가능 — 단, 네이티브 코드 변경(새 라이브러리 추가 등)은 빌드 필요.

## 미디어 컴포넌트 규칙

* 말씀 영상 재생(`expo-av`), 주보 핀치 줌(`react-native-image-zoom-viewer`), 라이브 스트림(`react-native-webview`)은 각각 성격이 다른 네이티브 레이어이므로 공통 wrapper로 억지로 통합하지 않는다. 각 라이브러리의 기본 API를 그대로 노출하는 얇은 wrapper만 둔다.
* 라이브 스트림 WebView는 일요일 방송 시간 여부에 따라 렌더 분기(스트림 vs 안내 화면)한다 — 분기 로직은 화면 컴포넌트가 아니라 상위 훅(`useLiveServiceStatus` 등)에서 처리하고 화면은 상태만 받아 렌더링한다.
* 영상/이미지 로딩·에러 상태(버퍼링, 로드 실패, 빈 데이터)는 별도 확인 없이 스켈레톤/에러 placeholder로 처리 가능하나, 해당 상태의 컬러·사이즈는 위 컬러/사이즈 규칙을 동일하게 따른다.

## 오픈 이슈 (TBD)

* 태블릿/포인터 입력 대응 여부 — 필요 시 hover/focus 규칙 별도 정의
