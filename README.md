# 온누리교회 청년부 앱

온누리교회 청년부를 위한 iOS/Android 모바일 앱입니다. 주간 말씀 영상, 주보, 큐티나눔, 팀별 게시판, 일요일 라이브 예배를 **외부 링크 이탈 없이 앱 안에서** 모두 이용할 수 있도록 하는 것이 목표입니다.

- **기획**: 이지환
- **디자인**: 남현지
- **개발**: 이지환, 이선환, 김인수, 나현지, 한재민, 양희진, 박도은
- **스프린트 기간**: 2026.06.19 ~ 2026.12.25

---

## 🔎 핵심 기능

- 주간 말씀 영상 인앱 재생 (또는 영상 요약 텍스트)
- 주차별 주보 이미지 열람 (핀치 줌 확대)
- 큐티나눔 게시판 (열람 + 로그인 후 작성)
- 소속 팀별 게시판 열람
- 일요일 한정 라이브 스트림 인앱 시청
- 로그인 기반 마이페이지 (이름·셀·소속팀 연동) 및 부서 전용 게시판 권한 관리

## 🎯 목표 사용자

1. 교회 청년부 (약 30명)
2. 중·장년 성도
3. 새신자 및 방문자

## 📦 기능 범위

### MVP
- 말씀 영상 목록 + 인앱 재생 (영상 요약 텍스트 제공)
- 주보 게시판 (이미지 확대)
- 큐티나눔 게시판 (열람 + 로그인 후 작성, 목사님 글 최상단)
- 기도 요청 게시판 (익명·댓글)
- 부서 스토리
- 로그인 + 마이페이지 (이름·셀·소속팀)
- 취향 소그룹 모임 게시판 (하루/한달/일년/영구 모임)
- 실시간 예배 (일요일)
- 설정 (밝기·언어)

### 추가 기능
- **1순위**: 청년부 소개글, 푸시 알림 고도화(말씀 업로드·예배 30분 전), 댓글/좋아요, QR 출석 체크
- **2순위**: 헌금 연동(카카오페이·토스), 다국어 지원 고도화(영어·중국어)
- **3순위**: 셀 전용 채팅방, 교회 일정 캘린더(구글 캘린더 연동), 새신자 온보딩 플로우
- **임원 회의 사항**: 유저 등급, 어드민 계정(데이터 접근 권한 포함)

---

## 🧱 모노레포 (Monorepo)

이 프로젝트는 **프론트엔드와 백엔드를 하나의 저장소에서 함께 관리하는 모노레포** 방식으로 진행합니다.

**왜 모노레포인가?**
- 프론트/백에서 공유하는 타입·유틸·상수를 `packages/`에 두고 양쪽에서 재사용
- 하나의 PR/커밋으로 프론트·백 변경을 함께 리뷰 → API 계약 불일치 최소화
- 통합된 스크립트/설정으로 팀 온보딩과 협업이 쉬움

### 폴더 구조

```
onnuri/
├── apps/
│   ├── mobile/              # 프론트엔드: React Native (Expo)
│   │   ├── src/
│   │   │   ├── screens/     # 화면 단위 컴포넌트
│   │   │   ├── components/  # 재사용 UI 컴포넌트
│   │   │   ├── navigation/  # React Navigation (Stack + Bottom Tab)
│   │   │   ├── store/       # 전역 상태 (Zustand)
│   │   │   ├── api/         # API 클라이언트 (Axios / TanStack Query)
│   │   │   ├── hooks/       # 커스텀 훅
│   │   │   └── types/       # 프론트 전용 타입
│   │   └── assets/          # 이미지·폰트 등 정적 리소스
│   │
│   └── api/                 # 백엔드: NestJS
│       ├── src/
│       │   ├── modules/     # 도메인 모듈 (auth, users, posts, ...)
│       │   ├── common/      # 가드·인터셉터·필터 등 공통 요소
│       │   └── config/      # 환경설정
│       ├── prisma/          # Prisma 스키마 & 마이그레이션
│       └── test/            # E2E / 통합 테스트
│
├── packages/
│   ├── shared/              # 프론트·백 공유 타입/상수/유틸
│   │   └── src/
│   └── config/              # 공유 설정 (ESLint, tsconfig 등)
│
├── docs/                    # 기획·설계 문서, 유저 플로우
└── scripts/                 # 개발/배포용 스크립트
```

> 폴더 골격만 우선 잡아둔 상태이며, 각 워크스페이스의 초기 세팅(Expo, NestJS, Prisma 등)은 이후 단계에서 진행합니다.

---

## 🔧 기술 스택

### 📱 프론트엔드
- **프레임워크**: React Native (Expo) — iOS/Android 동시 개발, 빠른 초기 세팅, OTA 업데이트
- **네비게이션**: React Navigation (Stack + Bottom Tab)
- **상태관리**: Zustand (또는 Redux Toolkit)
- **영상 재생**: expo-av / react-native-video
- **이미지 뷰어**: react-native-image-zoom-viewer (주보 핀치 줌)
- **스토리 UI**: react-native-snap-carousel 또는 커스텀 FlatList
- **라이브 스트림**: react-native-webview + 유튜브/외부 스트림 임베드
- **HTTP 통신**: Axios / TanStack Query (React Query)

### ⚙️ 백엔드
- **런타임/프레임워크**: Node.js + NestJS
- **인증**: JWT (Access Token + Refresh Token)
- **DB / ORM**: PostgreSQL + Prisma ORM  (`NestJS → Prisma → PostgreSQL`)
- **파일 스토리지**: AWS S3 또는 Cloudflare R2 (주보·스토리 이미지)
- **영상**: YouTube API / Vimeo 임베드 링크 관리 (별도 인코딩 없음)
- **푸시 알림**: Expo Push Notification 또는 Firebase FCM
- **실시간 예배**: 유튜브 라이브 / 자체 스트림 URL을 DB에서 관리

### ☁️ 인프라 / 배포
| 항목 | 추천 |
| --- | --- |
| 서버 호스팅 | Railway 또는 Render |
| DB 호스팅 | Supabase 또는 PlanetScale |
| 이미지 CDN | Cloudflare R2 또는 AWS S3 |
| 앱 배포 | Expo EAS Build → App Store / Play Store |

---

## 🤑 예상 비용

| 항목 | 비용 |
| --- | --- |
| 구글 플레이 등록 | 37,000원 (일회성) |
| 앱스토어 등록 | 약 146,000원/년 |
| 유튜브 API | 무료 |
| 영상 저장/스트리밍 | 무료 (유튜브가 담당) |
