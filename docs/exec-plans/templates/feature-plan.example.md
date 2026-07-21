<!--
이건 실제 Jira 티켓이 아니라 연습용 임의 예시입니다 (SCRUM-101은 가상의 키).
feature-plan.md 템플릿을 실제로 채워보면 어떤 느낌인지 확인하기 위한 draft입니다.
-->

# SCRUM-101: QT 게시판 목록 화면 구현

- Jira 이슈 키: SCRUM-101 (예시, 실제 티켓 아님)
- 요청자: (예시 - 요청자 없음)
- 작성일: 2026-07-21
- 상태: Draft

## 개요

`QtBoardScreen`이 현재 "큐티나눔"이라는 정적 텍스트만 표시하고 있음. Prisma 스키마에는 이미 `Post` 모델과 `BoardType.QT`가 정의되어 있지만, 이를 조회하는 API 모듈이 아직 없음. QT 게시글 목록을 실제로 불러와 화면에 보여주는 기능이 필요함.

(가정: 요구사항 원문이 "QT 게시판에 게시글 목록 좀 보이게 해줘" 한 줄이라고 가정하고, 아래 세부사항은 코드베이스 탐색을 바탕으로 AI가 채운 초안임 — 실제 작업 전 사람 확인 필요)

## Contract (구현 전 승인 대상)

**바꾸는 것**

- `apps/api`: `PostsModule` 신규 추가 — `GET /posts?boardType=QT&page=&limit=` 엔드포인트 (최신순 페이지네이션)
- `apps/mobile`: `QtBoardScreen`을 정적 텍스트 → API 호출 후 목록 렌더링(FlatList)으로 교체
- 로딩 / 빈 목록 / 에러 상태 UI 추가

**바꾸지 않는 것 (범위 밖)**

- 게시글 작성/수정/삭제 (이번엔 조회만)
- Prisma 스키마 변경 (`Post` 모델은 이미 있는 그대로 사용)
- 다른 게시판(`PRAYER`, `TEAM`, `GROUP`) 화면 — QT만 대상
- 댓글, 좋아요 등 부가 기능

**완료 조건**

- QT 게시판 화면에서 실제 DB의 QT 게시글이 최신순으로 표시됨
- 페이지네이션 동작 (다음 페이지 로드)
- 게시글 0개일 때 빈 상태 문구 표시
- API 실패 시 에러 상태 표시 (무한 로딩 없음)

## 작업 계획

1. `apps/api`: `PostsModule`, `PostsController`, `PostsService` 추가 — `boardType`, `page`, `limit` 쿼리 파라미터 처리
2. `apps/api`: 목록 조회 응답 DTO 정의 (`id`, `title`, `content` 일부, `author`, `isPinned`, `createdAt` 등, `isAnonymous`인 경우 작성자명 마스킹)
3. `apps/mobile`: API 클라이언트에 `getQtPosts(page)` 함수 추가
4. `apps/mobile`: `QtBoardScreen`을 FlatList 기반으로 교체, 스크롤 시 다음 페이지 로드
5. 로딩/빈 상태/에러 상태 UI 추가
6. API 쪽 유닛 테스트 추가 (페이지네이션, `isAnonymous` 마스킹)

## 진행 로그

<!-- 예시: 작업이 실제로 진행됐다면 이런 식으로 AI가 이어서 기록해둠 -->

- (예시) `PostsModule`/`PostsController`/`PostsService` 추가, `GET /posts?boardType=QT` 페이지네이션 구현
- (예시) `QtBoardScreen`을 FlatList 기반으로 교체, 로딩/빈 상태/에러 상태 UI 추가
- (예시) `isAnonymous` 게시글 작성자명 마스킹 로직 추가, 유닛 테스트 작성

## 열린 질문 / 리스크

- 이 엔드포인트에 로그인(JWT) 필요한지, 비로그인 사용자도 볼 수 있는지?
- 페이지당 개수 몇 개가 적당한지 (기본값 가정: 20)?
- `isAnonymous`인 게시글의 작성자 표시를 어떻게 마스킹할지 (예: "익명" 고정 문구 vs 익명 번호)?
- `isPinned` 게시글을 목록 상단에 고정할지 여부?

## 승인 로그

| 날짜 | 승인자 | 코멘트 |
| --- | --- | --- |
| | | (아직 승인 전 — 초안 검토 필요) |
