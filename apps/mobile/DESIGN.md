# DESIGN.md (React Native / Expo)

UI 작업 전 반드시 읽는다. 이 문서와 코드가 어긋나면 멈추고 확인한다. 규칙이 바뀌면 이 문서도 함께 갱신한다.

스택 전제: React Native (Expo), NativeWind(Tailwind), React Navigation (Stack + Bottom Tab), Zustand.

## 컬러 규칙

* semantic 토큰만 사용한다 (primitive 원시 스케일은 두지 않기로 확정). 그 외는 사용 금지.
* 원시 hex, 정의되지 않은 Tailwind 기본 팔레트는 사용하지 않는다.
* 토큰은 `tailwind.config.js` theme(`colors`, extend 아님)에 등록된 것만 인정한다 — 등록 안 된 색은 클래스 자체가 존재하지 않는다.
* 추측하지 않는다. semantic 토큰에 없으면 코딩을 멈추고 작업자(디자인: 남현지)에게 요청한다.
* **예외: 브랜드 자산의 색.** 카카오 노랑(`#FEE500`)처럼 남의 브랜딩 가이드가 고정한 색은 토큰으로 만들지 않는다 — 토큰은 우리가 바꿀 수 있는 색을 위한 것인데 이 색들은 바꾸면 안 되기 때문이다. 대신 그 자산을 감싼 컴포넌트(`features/auth/components/SocialLoginButton.tsx` 등) 안에서만 `style`로 직접 쓰고, 사용처는 색을 모른다. 아래 아이콘 규칙의 로고 예외와 같은 취급이다.

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
* **스케일 한 칸은 4px다.** Tailwind 기본 스케일은 rem 기반(`1` = `0.25rem`)이고, NativeWind는 네이티브에 rem이 없어서 빌드할 때 `inlineRem` 값으로 px 환산한다. 이 기본값이 14(= RN 기본 폰트 크기)라 그대로 두면 한 칸이 3.5px이 되므로, `metro.config.js`에서 웹과 같은 `inlineRem: 16`으로 맞춰뒀다. 그래서 `p-4`는 16px, `w-12`는 48px로 시안 px과 그대로 맞는다. **이 값을 바꾸면 앱 전체의 여백·사이즈가 한꺼번에 움직인다.**
* **`spacing`에는 rem이 아니라 px로 적는다.** 위 환산은 Tailwind 기본 스케일에만 적용되고 `spacing`에 직접 적은 값은 그대로 쓰이므로, px으로 적어야 시안 값이 보존된다. 키 번호는 `키 × 4 = px`에 맞춘다 — `17: "68px"`처럼 기본 스케일의 규칙과 어긋나지 않게 한다.
* radius도 같은 절차·같은 키 규칙을 따르되 `spacing`이 아니라 `borderRadius`에 등록한다 (`rounded-5` = 20px). Tailwind 기본 radius 스케일은 `rounded-2xl`(16px)에서 `rounded-3xl`(24px)로 건너뛰어서 그 사이 값이 없다.
* 주보 이미지 뷰어, 영상 플레이어처럼 콘텐츠 비율에 종속되는 영역(예: 16:9, 원본 이미지 비율)은 사이즈 토큰이 아니라 `aspectRatio`로 처리하고 별도 확인 없이 진행 가능.

## 그림자 규칙

* `tokens.js`의 `boxShadow`에 등록된 토큰만 쓴다(`shadow-card`). Tailwind 기본 `shadow-sm`/`shadow-md`나 arbitrary value는 쓰지 않는다 — 컬러·타이포와 같은 이유로, 시안에 없는 그림자를 만들지 않기 위해서다.
* **투명도는 색의 알파에 넣는다**(`#276E4C1A`). NativeWind가 `shadowOpacity`를 1로 고정하므로 별도 투명도 값을 줄 방법이 없다.
* **`boxShadow` 토큰 하나당 같은 이름의 `elevation` 토큰을 함께 정의한다.** 안드로이드는 그림자를 elevation으로 그리는데, 없으면 NativeWind가 blur 값을 그대로 elevation으로 써버려서(20px → elevation 20) iOS보다 훨씬 진하게 나온다.
* **안드로이드는 위로 뜨는 그림자를 그릴 수 없다.** elevation은 항상 아래로만 그려진다 — 하단 탭바처럼 위쪽 그림자가 필요한 곳은 `elevation` 토큰을 0으로 두고 iOS에서만 보이게 한다(`shadow-nav`). 값을 비워두면 안 되는 이유는 위 항목과 같다.
* CSS `box-shadow`의 spread(4번째 값)는 RN에 대응이 없어 무시되고, 그림자를 여러 겹 겹친 값은 **첫 번째 레이어만** 적용된다. 시안이 두 겹이면 임의로 합치지 말고 작업자(디자인: 남현지)에게 어느 쪽을 살릴지 확인한다.

## 아이콘 규칙

아이콘 팩(라이브러리)을 설치하지 않는다 — 쓰는 아이콘이 30개 안팎이고 출처가 여러 곳이라, SVG를 직접 모아서 자체 세트로 관리한다. 원본은 `src/shared/assets/icons/`.

* **화면에서 SVG 파일을 직접 import하지 않는다.** `shared/components/base/Icon.tsx`의 `<Icon name="bell" />`만 쓴다 — 아이콘을 교체하거나 나중에 팩으로 갈아타도 사용처를 안 건드리기 위해서다.
* 새 SVG는 `assets/icons/`에 넣고 `Icon.tsx`의 `ICONS` 맵에 한 줄 등록한다. 등록 안 하면 `name` 타입에 없어서 컴파일에서 막힌다.
* 파일명은 소문자 케밥(`chevron-left.svg`). **공백·대문자·언더스코어 금지** — import가 깨진다. 채운 버전은 `-active`/`-fill` 접미사로 구분한다(`bookmark.svg` / `bookmark-active.svg`).
* **색은 SVG에 넣지 않는다.** `svgr.config.js`가 파일에 박힌 hex를 전부 `currentColor`로 치환하고, 실제 색은 `Icon`의 `color` prop으로 위 컬러 규칙의 semantic 토큰을 넘겨서 정한다 (기본값 `icon.normal`). 새로 추가한 SVG에 아직 등록되지 않은 hex가 있으면 `svgr.config.js`에도 추가해야 치환된다. 이때 **표기가 글자 단위로 일치해야 한다** — `white`·`#FFFFFF`·`#ffffff`·`#FFF`가 전부 다른 값으로 취급되므로, SVG 쪽을 목록의 표기(대문자 6자리 hex)에 맞춘다.
* 크기는 `size` prop(기본 24). 원본 viewBox가 16/24/28로 섞여 있어 같은 `size`라도 획 굵기가 미세하게 달라 보일 수 있다 — 거슬리면 코드에서 보정하지 말고 Figma에서 그리드를 맞춰 다시 export한다.
* **로고는 아이콘이 아니다.** 색이 고정된 브랜드 자산은 `src/shared/assets/logo/`에 두고 `shared/components/base/Logo.tsx`로 쓴다 — `Icon`은 정사각형(`width=height=size`)을 강제하는데 로고는 222×46이고, 흰색+`#436E5D` 2색이 시안 확정값이라 `currentColor` 치환과도 맞지 않는다. `Logo`에는 `color` prop을 두지 않고, 자산이 늘어나면 `variant`로 받는다(`horizontal` 가로형(흰색, 어두운 배경용) · `horizontal-green` 가로형(초록, 밝은 배경용) · `symbol` 정사각 심볼 · `wordmark` 타이틀). 심볼만 PNG(1024×1024)라 `Image`로 그린다 — SVG를 받으면 `Logo.tsx`만 고치면 된다.
  * **치환을 피하려고 위 목록에 없는 표기(`white` 키워드, 소문자 hex)를 의도적으로 쓴다.** `assets/logo/`의 색 표기는 위의 "대문자 6자리 hex에 맞춘다" 규칙을 적용하지 않는다 — 정규화하면 로고가 한 색으로 뭉개진다. (`wordmark-title.svg`의 `#276e4c`가 그 예다. 대문자로 "정리"하면 초록이 사라진다.)
  * 카카오·구글 같은 **제3자 브랜드 마크도 같은 폴더**에 둔다. 다만 `Logo`가 아니라 그 마크를 쓰는 컴포넌트(`SocialLoginButton`)에서만 import한다 — 우리 로고가 아니라서 `Logo`의 variant로 섞으면 앱 로고와 구분이 안 된다. 색은 위 컬러 규칙의 브랜드 자산 예외를 따른다.
* SVG→컴포넌트 변환은 `react-native-svg-transformer`가 하고 `metro.config.js`에서 설정한다. NativeWind가 `transformerPath`를 자기 것으로 교체하며 기존 값을 체이닝하므로, **SVG 설정은 반드시 `withNativeWind()` 호출 전에** 둔다. 순서가 뒤집히면 변환이 통째로 무시된다.

## 컴포넌트 배치 규칙

컴포넌트가 **도메인을 아는지**로 나눈다. 재사용 횟수가 아니라 이 기준이다.

* `shared/components/base/` — 베이스 컴포넌트. 도메인을 모르고 props로만 동작한다 (`Chip`은 "SNS팀"이 뭔지 모르고 색과 텍스트만 받는다). 어느 화면에 갖다 놔도 말이 되면 여기. 위 타이포그래피 규칙의 굵기 덮어쓰기 예외가 적용되는 유일한 위치다.
* `features/<기능>/components/` — 베이스를 조합한 컴포넌트. 도메인을 안다 (게시글 카드는 게시글에 작성자·작성일이 있다는 걸 안다). 특정 화면 맥락에서만 말이 되면 여기.
* 두 번째 기능이 실제로 같은 조합 컴포넌트를 필요로 하면 그때 `shared/components/composed/`로 올린다. 미리 올리지 않는다 — 두 화면의 공통점을 보기 전에 설계하면 안 쓰는 유연성이 붙는다.
* **홈처럼 여러 도메인을 모아 보여주는 화면은 다른 feature의 컴포넌트를 직접 import한다** (`features/home` → `features/prayer-board/components/PrayerCard`). 같은 카드를 두 벌 만드는 것보다 낫고, 쓰는 곳이 아직 한 곳뿐이라 `composed`로 올리기에는 이르다.
  * 단 **모양이 다르면 재사용하지 않는다.** 홈의 큐티나눔 행·부서활동 카드는 각 게시판의 카드(`QtPostCard`·`TeamPostCard`)와 레이아웃이 아예 달라서 `features/home/components/`에 따로 만들었다. 같은 도메인이라는 이유만으로 props를 붙여 한 컴포넌트에 합치지 않는다.

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

## 이벤트 핸들러 네이밍 규칙

props(인터페이스)와 내부 함수(구현)의 이름을 구분한다. 연결부는 `onPress={handleCardPress}`처럼 "자리 = 꽂는 함수"로 읽힌다.

* **콜백 props는 `on<이벤트>`** — `onPress`, `onSelect`, `onSubmit`. RN 기본 컴포넌트(`Pressable`의 `onPress` 등)와 같은 관례다. 같은 종류의 이벤트가 둘 이상이면 대상을 붙인다 (`onLikePress`, `onCommentSubmit`).
* **내부 구현 함수는 `handle<대상><이벤트>`** — `handleWritePress`, `handleLikePress`, `handleCommentSubmit`. 대상 생략(`handlePress`)은 그 이벤트가 화면에 하나뿐일 때만 허용한다.
* **내부 함수 이름에 `on*`을 쓰지 않는다** — props로 받은 것인지 지역에서 만든 것인지 읽을 때마다 헷갈린다.

## 작업 시작 조건

아래가 모두 확보되지 않으면 코딩을 시작하지 않는다.

* [ ] variant 각 축의 정확한 enum 값
* [ ] size별 height / padding / gap / radius
* [ ] 상태별(pressed·disabled 등) 컬러 토큰 규칙

## 레이아웃 · 내비게이션 규칙

* 앱 루트는 `SafeAreaProvider` → `SafeAreaView`. 웹처럼 `max-w` / 데스크톱 중앙 정렬 개념 없음 — 네이티브 앱은 항상 디바이스 전체 화면.
* Safe area는 `react-native-safe-area-context`의 `useSafeAreaInsets()`로 처리한다. `.pt-safe`/`.pb-safe` 같은 CSS 유틸은 RN에 없음 — Header/BottomNav 컴포넌트가 각자 insets 값을 받아 padding으로 적용.
* 내비게이션 구조: 루트 `Stack.Navigator` 안에 `Tab.Navigator`(메인 탭, BottomNav 포함)를 하나의 스크린으로 넣고, 그 외 화면은 루트 Stack에 push한다.
  * 메인 탭(`Tab.Navigator` 직접 등록, BottomNav 노출): 홈 · 팀 스토리 · 말씀(가운데, 탭바 위로 튀어나온 원형 버튼) · 셀 페이지 · MY(마이페이지)
  * 큐티나눔·실시간예배·**오늘 주보**는 하단 탭이 아니라 **홈 화면에서 진입하는 화면**이다 — 루트 `Stack.Navigator`에 등록해서 홈에서 push한다.
  * **QR은 탭이 아니라 메인 헤더의 QR 버튼에서 연다** — 루트 `Stack.Navigator`의 `Qr`로 push한다. 가운데 원형 버튼은 아이콘(`book-open-alt-light`)대로 말씀으로 간다.
  * 서브(루트/각 탭 내부 `Stack`에서 push, BottomNav 없음): 위 화면들 외에 말씀 영상 상세, 주보 상세, 큐티나눔 작성, 기도요청 작성/상세, 팀 게시판 상세, 소그룹 모임 상세, 로그인/회원가입 등
  * 웹 버전의 `(main)/`, `(sub)` route group 구분과 동일한 개념을 폴더 대신 Navigator 등록 위치로 표현.
* BottomNav는 `shared/components/base/BottomNav.tsx`에 구현하고 `Tab.Navigator`의 `tabBar` prop으로 넘긴다 — 가운데 말씀 버튼이 탭바 위로 튀어나오고 배경·그림자도 시안 값이라 기본 탭바 옵션으로는 맞출 수 없다.
  * 라벨은 BottomNav가 각 `Tab.Screen`의 `options.title`에서 읽는다. 컴포넌트 안에 문자열을 따로 두지 않는다.
  * **튀어나온 버튼을 탭바의 자식으로 두지 않는다.** 안드로이드는 부모 경계 밖으로 나간 자식의 터치를 받지 못해서 원의 위쪽 절반이 안 눌린다. 컨테이너를 튀어나온 높이(32)만큼 키워 버튼을 그 안에 담고, 흰 배경은 아래 탭바에만 칠하고, 위쪽 빈 영역은 `pointerEvents="box-none"`으로 통과시킨다.
  * **탭바 흰 배경은 배경색이 아니라 `react-native-svg`의 `Path`로 그린다.** 시안에서 가운데 버튼 둘레 7이 뚫려 있어(뒤 콘텐츠가 그대로 비친다) 배경색 View로는 만들 수 없다 — 윗변 가운데를 반지름 41(버튼 지름 68의 절반 + 7)로 파낸다. 구멍 중심은 버튼 중심과 같다.
    * 파인 자리와 윗변은 각지지 않고 반지름 10으로 이어진다(시안 export에 값이 없어 눈으로 맞춘 값이다). 윗변에 접하면서 구멍 원에 외접하는 원을 두고, 두 접점을 호로 잇는다 — 접점에서 이으면 기울기가 끊기지 않는다.
    * 그래서 배경 View에는 `bg-*`가 없다. `shadow-nav`는 그 자리에 남겨둔다 — iOS는 배경색이 없으면 내용의 알파로 그림자를 계산해서 뚫린 모양을 따라간다.
  * 활성/비활성은 색만 바꾼다 (아이콘 `icon.strong`↔`icon.normal`, 라벨 `text.normal`↔`text.alternative`). 시안이 탭별로 채운/선 아이콘을 따로 주지 않았다 — 홈이 채워 보이는 건 원본 SVG(`nav-home`)가 원래 채운 그림이기 때문이지 활성 전용 아이콘이 아니다.
  * 가운데 말씀 버튼에는 라벨도 pressed/focused 표현도 없다. 시안이 원 아래를 비워두고 상태 스펙도 주지 않아서 임의로 만들지 않았다 — `options.title`("말씀")은 접근성 레이블로만 쓴다.
* BottomNav 활성 탭은 React Navigation이 관리하는 상태(`useNavigationState` 또는 tab navigator의 `focused` prop)로 결정한다. Zustand로 별도 복제하지 않는다 — Zustand는 이 프로젝트에서 다른 전역 상태(로그인 세션, 유저 프로필 등)에는 쓰되, 내비게이션이 이미 소유한 상태를 중복 관리하지 않는다는 원칙은 유지.
* Header는 `shared/components/base/Header.tsx`에 구현, 두 variant로 나뉜다 (Figma 확정):
  * `variant="main"` — 메인 탭 5개 화면에 공통 적용. 좌측에 가로형 로고(`Logo variant="horizontal-green"`), 우측에 QR·알림·설정 버튼. `BottomTabNavigator`의 `screenOptions.header`로 적용.
  * `variant="sub"` — 탭 밖에서 push되는 화면용. 뒤로가기, 가운데 타이틀, 우측 버튼. `RootNavigator`의 각 `Stack.Screen options.header`로 적용 (반드시 `headerShown: true`도 같이 줘야 렌더링됨 — `headerShown: false`가 있으면 `header` 함수를 줘도 아예 안 그려짐).
    * 우측 버튼은 `rightAction`으로 고른다: `more`(기본, 더보기 ⋮) · `home`(메인 탭으로) · `export`(공유, 주보·나눔지 상세) · `none`(버튼 없이 자리만 비워 타이틀을 가운데 유지). 시안에 없는 새 동작이 필요하면 화면에서 따로 그리지 말고 여기에 값을 추가한다.
    * ⋮ 드롭다운은 `menuItems`(ContextMenuItem 배열)로 헤더가 직접 연다. 메뉴 위치는 상수로 두지 않고 ⋮ 버튼을 `measureInWindow`로 실측해 그 아래에 붙인다 — 헤더 높이·아이콘 크기가 바뀌어도 따라온다. **헤더 정의는 화면당 정확히 한 곳**: 항목이 고정이면 RootNavigator 등록부에서 넘기고, 화면 데이터에 의존하면(예: 내 글일 때만 ⋮ — QtBoardDetail) 화면이 `useLayoutEffect`+`setOptions`로 헤더를 단독 등록하고 등록부에는 `headerShown: true`만 둔다.
  * 알림·설정·뒤로가기·더보기 버튼은 `Icon` 컴포넌트로 렌더한다 (`size={28}`, `color={colors.icon.strong}` — 원본 SVG가 28 그리드에 `#444444`로 그려져 있다). 아래 아이콘 규칙 참고.
* **화면 트리는 `RootNavigator` 한 곳에서만 분기한다.** `useAuthStore`의 `session.status`를 보고 `authenticated`·`guest`면 `Main`(탭)+`QtBoard`+`Live`가 있는 스택, `unauthenticated`면 `Login`+`ProfileSetup`이 있는 `AuthStack`을 그린다. 개별 화면에서 세션 체크 후 조건부 push하지 않는다. (상태값 정의와 게스트가 못 하는 동작은 [ARCHITECTURE.md](../../ARCHITECTURE.md)의 Access Model 참고.)
  * 준비가 끝나기 전(`loading`)에는 스플래시가 `NavigationContainer` **바깥에서** 트리를 통째로 대신한다. 스크린으로 등록하지 않는다 — 뒤로가기 대상이 되면 안 되고 네비게이션도 쓰지 않기 때문이다. 온보딩처럼 화면이 여러 장 붙으면 그때 별도 `Stack`으로 올린다.
  * 준비 작업(최소 노출 시간, 향후 세션 복원 등)은 `shared/hooks/useAppBootstrap.ts`가 맡고, 스플래시 화면은 상태만 받아 렌더링한다.
  * 스플래시 배경은 `SafeAreaView`로 감싸지 않는다 — 네이티브 스플래시가 화면 전체를 덮으므로, inset에서 배경이 끊기면 전환 순간 노치·홈 인디케이터 영역에 흰 띠가 보인다.
* 오버레이(Toast · Modal · BottomSheet)는 `@gorhom/bottom-sheet` 하나로 통일한다. 바텀시트는 `BottomSheet`/`BottomSheetModal`, 일반 모달·Toast도 별도 라이브러리 없이 같은 패키지의 `BottomSheetModal`로 화면 최상위 네이티브 레이어에 띄운다. `AppToast` · `AppDialog` · `AppSheet`(`src/shared/components/base/`에 위치)는 여닫기 제어와 애니메이션 트리거만 담당하고, 내부 렌더링은 `BottomSheetModal`에 위임한다 (웹처럼 컨테이너 안 절대 위치로 직접 쌓지 않음).
  * 여닫기는 전역 store가 아니라 `AppSheet`·`AppDialog`가 노출하는 `ref`(`open`/`close`)로 호출부가 제어한다. 부르는 곳이 늘어나 화면 밖에서 띄울 일이 생기면 그때 store를 얹는다. (`AppToast`는 아직 없다.)
  * 확인 팝업(삭제 확인, 로그인 안내, 이동 확인)은 `AppDialog`를 쓴다. 시트와 달리 좌우 여백을 두고 사방이 둥근 하단 카드라, `BottomSheetModal`의 `detached` + `bottomInset`으로 바닥에서 띄우고 핸들(`handleComponent={null}`)과 판다운을 끈다. 문구·버튼 라벨은 props로 받고, `cancelLabel`을 주면 버튼 두 개, 안 주면 확인 버튼 하나가 카드 폭을 다 쓴다.
  * ⋮ 드롭다운처럼 **특정 버튼에 붙는 팝오버**(`ContextMenu`)는 예외로 RN `Modal`을 쓴다 — 위치가 앵커 기준(버튼 좌표)이라 바닥 기준인 `detached` 시트로는 좌표를 역산해야 하고, 아래에서 올라오는 시트 애니메이션도 드롭다운과 맞지 않는다. 화면 단위로 뜨는 오버레이만 위 통일 규칙의 대상이다.
  * 시트 높이는 `snapPoints` 고정이 아니라 내용에 맞춘다(dynamic sizing, 상한은 시안 750/874 → 화면의 86%). 고정 높이로 두면 내용이 짧을 때 아래에 빈 공간이 남는데, 그 빈 공간을 없애려고 `flex`로 바닥에 붙이는 방법은 안 통한다 — `BottomSheetView`가 내부에서 `position: absolute`(`top`/`left`/`right`만 지정)를 자기 style 뒤에 붙여서 높이가 내용에 붙어버리기 때문이다.
  * 시트 내용은 `BottomSheetView`가 아니라 `BottomSheetScrollView`로 받는다 — 목록이 상한을 넘을 때 잘리지 않고 스크롤된다.
  * 스크롤과 무관하게 시트 바닥에 붙어 있어야 하는 것(취소 버튼 등)은 `AppSheet`의 `footer` prop으로 넘긴다 — 내용 안에 두면 같이 스크롤돼서 올라간다. 푸터는 내용 위에 떠 있으므로 배경색을 직접 칠한다.
* OTA 업데이트(Expo EAS Update)로 UI 수정 배포 시 스토어 심사 없이 반영 가능 — 단, 네이티브 코드 변경(새 라이브러리 추가 등)은 빌드 필요.

## 미디어 컴포넌트 규칙

* 말씀 영상 재생(`expo-video`), 주보 핀치 줌(`react-native-image-zoom-viewer`), 라이브 스트림(`react-native-webview`)은 각각 성격이 다른 네이티브 레이어이므로 공통 wrapper로 억지로 통합하지 않는다. 각 라이브러리의 기본 API를 그대로 노출하는 얇은 wrapper만 둔다.
* 라이브 스트림 WebView는 일요일 방송 시간 여부에 따라 렌더 분기(스트림 vs 안내 화면)한다 — 분기 로직은 화면 컴포넌트가 아니라 상위 훅(`useLiveServiceStatus` 등)에서 처리하고 화면은 상태만 받아 렌더링한다.
* 영상/이미지 로딩·에러 상태(버퍼링, 로드 실패, 빈 데이터)는 별도 확인 없이 스켈레톤/에러 placeholder로 처리 가능하나, 해당 상태의 컬러·사이즈는 위 컬러/사이즈 규칙을 동일하게 따른다.

## 오픈 이슈 (TBD)

* 태블릿/포인터 입력 대응 여부 — 필요 시 hover/focus 규칙 별도 정의
* 아이콘 원본에만 있던 색 3건 중 둘은 컬러차트가 정리해줬다 — `icon.strongest`(`#111111`)는 `text.normal`로, `icon.danger`(`#EF4444`)는 `semantic.danger`로 접고 토큰에서 지웠다. 이후 좋아요 아이콘(`favorite-light.svg`)이 `#040509`로 교체되면서 `icon.strongest`가 **다른 값으로 다시 생겼다** — 접었던 `#111111`과는 별개 색이니 같은 것으로 보지 않는다. 남은 `icon.accent`(`#436E5D`)는 차트에 대응 항목이 없다. 로고(`assets/logo/`)에 시안 확정값으로 박힌 색과 같아서, 아이콘용 semantic 토큰으로 남길지 로고 전용으로 접을지 미확인이다.
* `semantic.info`(`#E9E9F2`)의 이름이 임시다. 값만 받았고 용도를 못 들었다 — `warning`/`danger`가 진한 전경색인 것과 달리 혼자 아주 밝은 틴트라, 역할 이름(`info`)이 아니라 `background`의 색상 이름(`gold`/`red`) 쪽에 속할 가능성이 있다. 실제 쓰임을 확인하면 이름과 위치를 확정한다.
