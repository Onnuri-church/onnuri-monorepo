# DESIGN.md (React Native / Expo)

UI 작업 전 반드시 읽는다. 이 문서와 코드가 어긋나면 멈추고 확인한다. 규칙이 바뀌면 이 문서도 함께 갱신한다.

스택 전제: React Native (Expo), NativeWind(Tailwind), React Navigation (Stack + Bottom Tab), Zustand.

## 컬러 규칙

* semantic 토큰만 사용한다 (primitive 원시 스케일은 두지 않기로 확정). 그 외는 사용 금지.
* 원시 hex, 정의되지 않은 Tailwind 기본 팔레트는 사용하지 않는다.
* 토큰은 `tailwind.config.js` theme(`colors`, extend 아님)에 등록된 것만 인정한다 — 등록 안 된 색은 클래스 자체가 존재하지 않는다.
* 추측하지 않는다. semantic 토큰에 없으면 코딩을 멈추고 작업자(디자인: 남현지)에게 요청한다.

## 타이포그래피 규칙

* 텍스트 스타일 클래스(`text-title`, `text-body-small` 등)에 사이즈·행간·자간·**굵기**가 전부 묶여 있다. 화면에서는 이 클래스 하나만 쓴다 — `font-pretendard-*`를 같이 붙이지 않는다.
* 굵기를 다르게 써야 하면 `shared/components/base/`의 베이스 컴포넌트 안에서, 시안 근거가 있을 때만 `font-pretendard-*`를 덧붙여 덮어쓴다. 컴포넌트가 그 결정을 감추므로 화면은 굵기를 고를 일이 없다. (텍스트 스타일은 components 레이어, `font-pretendard-*`는 utilities 레이어라 클래스 순서와 무관하게 덮어쓰기가 보장된다.)
* **`shared/components/base/` 밖(조합 컴포넌트·화면·기능 코드)에서는 `TEXT_STYLE`에 등록된 텍스트 스타일만 쓴다.** Tailwind 기본 `text-sm`/`text-base` 등은 클래스로 존재하기는 하지만 쓰지 않는다 — 설정으로 막지 않는 건 이미 기본 사이즈로 작성된 코드를 깨지 않기 위해서지, 써도 된다는 뜻이 아니다.
* 폰트 패밀리는 `tailwind.config.js`가 통째로 교체하므로 `font-sans`/`font-serif`/`font-mono`는 클래스 자체가 없다.
* 값은 `src/shared/theme/tokens.js`의 `TEXT_STYLE`이 단일 소스. 시안에 없는 조합이 필요하면 추측하지 말고 작업자(디자인: 남현지)에게 요청한다.

## 사이즈·간격 규칙

* 컬러·타이포그래피를 제외한 sizing / gap / padding / radius는 Tailwind 기본 스케일만 쓴다.
* arbitrary value(`w-[72px]`)는 쓰지 않는다.
* 스펙이 기본 스케일에 맞지 않으면 작업자에게 확인한다. (디바이스 픽셀 이슈로 예외가 필요해 보여도 임의로 처리하지 않는다.)
* **확인 결과 시안 확정값이면** `tokens.js`의 `spacing`에 등록한다. 확인 없이 추가하지 않는다 — 이 예외를 열어둔 건 기본 스케일에 없는 값(예: 72px은 `...12, 14, 16, 20...` 사이에 없다)을 표현할 방법이 아예 없기 때문이지, 편할 때 쓰라는 뜻이 아니다.
* **rem 주의 — `spacing`에는 rem이 아니라 px로 적는다.** NativeWind의 `inlineRem`이 기본값 14라 네이티브에서 `1rem = 14px`다. Tailwind 기본 스케일은 rem 기반이므로 `w-16`은 64px이 아니라 56px, `w-20`은 70px이다. rem으로 적으면 시안 px과 어긋난다.
* 주보 이미지 뷰어, 영상 플레이어처럼 콘텐츠 비율에 종속되는 영역(예: 16:9, 원본 이미지 비율)은 사이즈 토큰이 아니라 `aspectRatio`로 처리하고 별도 확인 없이 진행 가능.

## 그림자 규칙

* `tokens.js`의 `boxShadow`에 등록된 토큰만 쓴다(`shadow-card`). Tailwind 기본 `shadow-sm`/`shadow-md`나 arbitrary value는 쓰지 않는다 — 컬러·타이포와 같은 이유로, 시안에 없는 그림자를 만들지 않기 위해서다.
* **투명도는 색의 알파에 넣는다**(`#276E4C1A`). NativeWind가 `shadowOpacity`를 1로 고정하므로 별도 투명도 값을 줄 방법이 없다.
* **`boxShadow` 토큰 하나당 같은 이름의 `elevation` 토큰을 함께 정의한다.** 안드로이드는 그림자를 elevation으로 그리는데, 없으면 NativeWind가 blur 값을 그대로 elevation으로 써버려서(20px → elevation 20) iOS보다 훨씬 진하게 나온다.
* CSS `box-shadow`의 spread(4번째 값)는 RN에 대응이 없어 무시되고, 그림자를 여러 겹 겹친 값은 **첫 번째 레이어만** 적용된다. 시안이 두 겹이면 임의로 합치지 말고 작업자(디자인: 남현지)에게 어느 쪽을 살릴지 확인한다.

## 아이콘 규칙

아이콘 팩(라이브러리)을 설치하지 않는다 — 쓰는 아이콘이 30개 안팎이고 출처가 여러 곳이라, SVG를 직접 모아서 자체 세트로 관리한다. 원본은 `src/shared/assets/icons/`.

* **화면에서 SVG 파일을 직접 import하지 않는다.** `shared/components/base/Icon.tsx`의 `<Icon name="bell" />`만 쓴다 — 아이콘을 교체하거나 나중에 팩으로 갈아타도 사용처를 안 건드리기 위해서다.
* 새 SVG는 `assets/icons/`에 넣고 `Icon.tsx`의 `ICONS` 맵에 한 줄 등록한다. 등록 안 하면 `name` 타입에 없어서 컴파일에서 막힌다.
* 파일명은 소문자 케밥(`chevron-left.svg`). **공백·대문자·언더스코어 금지** — import가 깨진다. 채운 버전은 `-active`/`-fill` 접미사로 구분한다(`bookmark.svg` / `bookmark-active.svg`).
* **색은 SVG에 넣지 않는다.** `svgr.config.js`가 파일에 박힌 hex를 전부 `currentColor`로 치환하고, 실제 색은 `Icon`의 `color` prop으로 위 컬러 규칙의 semantic 토큰을 넘겨서 정한다 (기본값 `icon.normal`). 새로 추가한 SVG에 아직 등록되지 않은 hex가 있으면 `svgr.config.js`에도 추가해야 치환된다. 이때 **표기가 글자 단위로 일치해야 한다** — `white`·`#FFFFFF`·`#ffffff`·`#FFF`가 전부 다른 값으로 취급되므로, SVG 쪽을 목록의 표기(대문자 6자리 hex)에 맞춘다.
* 크기는 `size` prop(기본 24). 원본 viewBox가 16/24/28로 섞여 있어 같은 `size`라도 획 굵기가 미세하게 달라 보일 수 있다 — 거슬리면 코드에서 보정하지 말고 Figma에서 그리드를 맞춰 다시 export한다.
* **로고는 아이콘이 아니다.** 색이 고정된 다색 브랜드 자산은 `src/shared/assets/logo/`에 두고 `shared/components/base/Logo.tsx`로 쓴다 — `Icon`은 정사각형(`width=height=size`)을 강제하는데 로고는 222×46이고, 흰색+`#436E5D` 2색이 시안 확정값이라 `currentColor` 치환과도 맞지 않는다. `Logo`에는 `color` prop을 두지 않는다.
  * **치환을 피하려고 위 목록에 없는 표기(`white` 키워드, 소문자 hex)를 의도적으로 쓴다.** `assets/logo/`의 색 표기는 위의 "대문자 6자리 hex에 맞춘다" 규칙을 적용하지 않는다 — 정규화하면 로고가 한 색으로 뭉개진다.
* SVG→컴포넌트 변환은 `react-native-svg-transformer`가 하고 `metro.config.js`에서 설정한다. NativeWind가 `transformerPath`를 자기 것으로 교체하며 기존 값을 체이닝하므로, **SVG 설정은 반드시 `withNativeWind()` 호출 전에** 둔다. 순서가 뒤집히면 변환이 통째로 무시된다.

## 컴포넌트 배치 규칙

컴포넌트가 **도메인을 아는지**로 나눈다. 재사용 횟수가 아니라 이 기준이다.

* `shared/components/base/` — 베이스 컴포넌트. 도메인을 모르고 props로만 동작한다 (`Chip`은 "SNS팀"이 뭔지 모르고 색과 텍스트만 받는다). 어느 화면에 갖다 놔도 말이 되면 여기. 위 타이포그래피 규칙의 굵기 덮어쓰기 예외가 적용되는 유일한 위치다.
* `features/<기능>/components/` — 베이스를 조합한 컴포넌트. 도메인을 안다 (게시글 카드는 게시글에 작성자·작성일이 있다는 걸 안다). 특정 화면 맥락에서만 말이 되면 여기.
* 두 번째 기능이 실제로 같은 조합 컴포넌트를 필요로 하면 그때 `shared/components/composed/`로 올린다. 미리 올리지 않는다 — 두 화면의 공통점을 보기 전에 설계하면 안 쓰는 유연성이 붙는다.

## export 규칙

**컴포넌트·화면·네비게이터는 named export만 쓴다** (`export function Chip()`). `export default`는 쓰지 않는다.

* 유일한 예외는 진입점 `App.tsx` — `registerRootComponent`가 받는 루트 컴포넌트라 default export를 유지한다.
* import도 이름을 그대로 쓴다: `import { HomeScreen } from "../features/home/HomeScreen"`. 별칭을 붙이지 않는다.
* 이유: default export는 import 쪽 이름이 임의라 원본 이름을 바꿔도 조용히 어긋나고, 오타(`HomeScren`)도 타입 에러가 안 난다. named면 rename 리팩터링이 import 사이트까지 따라오고 오타는 즉시 잡힌다.
* Expo/RN 템플릿과 문서 예제는 대부분 `export default function`이라 복붙하면 섞이기 쉽다. 새 파일을 만들 때 확인한다. (이 프로젝트는 expo-router를 쓰지 않으므로 default export를 강제하는 파일이 없다.)

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
* Header는 `shared/components/base/Header.tsx`에 구현, 두 variant로 나뉜다 (Figma 확정):
  * `variant="main"` — 메인 탭 5개 화면에 공통 적용. 로고+앱 이름("ONNURI YOUTH")+서브텍스트, 우측에 알림·설정 버튼. `BottomTabNavigator`의 `screenOptions.header`로 적용.
  * `variant="sub"` — 탭 밖에서 push되는 화면용. 뒤로가기, 가운데 타이틀, 우측 더보기(⋮) 버튼. `RootNavigator`의 각 `Stack.Screen options.header`로 적용 (반드시 `headerShown: true`도 같이 줘야 렌더링됨 — `headerShown: false`가 있으면 `header` 함수를 줘도 아예 안 그려짐).
  * 알림·설정·뒤로가기·더보기 버튼은 `Icon` 컴포넌트로 렌더한다 (`size={28}`, `color={colors.icon.strong}` — 원본 SVG가 28 그리드에 `#444444`로 그려져 있다). 아래 아이콘 규칙 참고.
* **모든 화면이 로그인을 요구한다** (예외 없음). `RootNavigator`가 `useAuthStore`의 `session.status`로 트리 전체를 분기한다 — `authenticated`면 `Main`(탭)+`QtBoard`+`Live`가 있는 스택, `unauthenticated`면 `Login`만 있는 `AuthStack`. 개별 화면에서 세션 체크 후 조건부 push하지 않는다. (상태값 정의는 [ARCHITECTURE.md](../../ARCHITECTURE.md)의 Access Model 참고.)
  * 준비가 끝나기 전(`loading`)에는 스플래시가 `NavigationContainer` **바깥에서** 트리를 통째로 대신한다. 스크린으로 등록하지 않는다 — 뒤로가기 대상이 되면 안 되고 네비게이션도 쓰지 않기 때문이다. 온보딩처럼 화면이 여러 장 붙으면 그때 별도 `Stack`으로 올린다.
  * 준비 작업(최소 노출 시간, 향후 세션 복원 등)은 `shared/hooks/useAppBootstrap.ts`가 맡고, 스플래시 화면은 상태만 받아 렌더링한다.
  * 스플래시 배경은 `SafeAreaView`로 감싸지 않는다 — 네이티브 스플래시가 화면 전체를 덮으므로, inset에서 배경이 끊기면 전환 순간 노치·홈 인디케이터 영역에 흰 띠가 보인다.
* 오버레이(Toast · Modal · BottomSheet)는 `@gorhom/bottom-sheet` 하나로 통일한다. 바텀시트는 `BottomSheet`/`BottomSheetModal`, 일반 모달·Toast도 별도 라이브러리 없이 같은 패키지의 `BottomSheetModal`로 화면 최상위 네이티브 레이어에 띄운다. `AppToast` · `AppModal` · `AppSheet`(`src/shared/components/base/`에 위치)는 store 구독과 애니메이션 트리거만 담당하고, 내부 렌더링은 `BottomSheetModal`에 위임한다 (웹처럼 컨테이너 안 절대 위치로 직접 쌓지 않음).
* OTA 업데이트(Expo EAS Update)로 UI 수정 배포 시 스토어 심사 없이 반영 가능 — 단, 네이티브 코드 변경(새 라이브러리 추가 등)은 빌드 필요.

## 미디어 컴포넌트 규칙

* 말씀 영상 재생(`expo-av`), 주보 핀치 줌(`react-native-image-zoom-viewer`), 라이브 스트림(`react-native-webview`)은 각각 성격이 다른 네이티브 레이어이므로 공통 wrapper로 억지로 통합하지 않는다. 각 라이브러리의 기본 API를 그대로 노출하는 얇은 wrapper만 둔다.
* 라이브 스트림 WebView는 일요일 방송 시간 여부에 따라 렌더 분기(스트림 vs 안내 화면)한다 — 분기 로직은 화면 컴포넌트가 아니라 상위 훅(`useLiveServiceStatus` 등)에서 처리하고 화면은 상태만 받아 렌더링한다.
* 영상/이미지 로딩·에러 상태(버퍼링, 로드 실패, 빈 데이터)는 별도 확인 없이 스켈레톤/에러 placeholder로 처리 가능하나, 해당 상태의 컬러·사이즈는 위 컬러/사이즈 규칙을 동일하게 따른다.

## 오픈 이슈 (TBD)

* 태블릿/포인터 입력 대응 여부 — 필요 시 hover/focus 규칙 별도 정의
* 아이콘 원본에만 있던 색 3건 중 둘은 컬러차트가 정리해줬다 — `icon.strongest`(`#111111`)는 `text.normal`로, `icon.danger`(`#EF4444`)는 `semantic.danger`로 접고 토큰에서 지웠다. 남은 `icon.accent`(`#436E5D`)는 차트에 대응 항목이 없다. 로고(`assets/logo/`)에 시안 확정값으로 박힌 색과 같아서, 아이콘용 semantic 토큰으로 남길지 로고 전용으로 접을지 미확인이다.
* `semantic.info`(`#E9E9F2`)의 이름이 임시다. 값만 받았고 용도를 못 들었다 — `warning`/`danger`가 진한 전경색인 것과 달리 혼자 아주 밝은 틴트라, 역할 이름(`info`)이 아니라 `background`의 색상 이름(`gold`/`red`) 쪽에 속할 가능성이 있다. 실제 쓰임을 확인하면 이름과 위치를 확정한다.
