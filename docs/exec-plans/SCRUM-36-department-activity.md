# SCRUM-36: 부서활동 목록·상세 실데이터 연동

- Jira 이슈 키: SCRUM-36
- 요청자: (확인 필요 — Jira Reporter 기준)
- 작성일: 2026-09-26
- 상태: In Progress

## 개요

부서활동 목록·상세·작성 화면은 이미 `apps/mobile/src/features/department-activity/`에 있지만 세 화면 모두 하드코딩된 임시 데이터로 그려져 있다 (`// API 연동 전 임시 데이터`). 상세 화면은 작성자·제목·내용까지 JSX에 박혀 있고 좋아요는 `console.log`다.

백엔드에는 부서활동 게시판 API가 아직 없다. `BoardType.TEAM_ACTIVITY`(teamId 필수) enum만 정의돼 있고 이를 쓰는 코드는 한 줄도 없다. 큐티나눔이 지나온 경로(UI 먼저 → 실데이터 연동)를 부서활동에도 그대로 적용한다.

스키마는 이미 필요한 걸 다 갖고 있어 **마이그레이션은 없다** — `Post.teamId`·`viewCount`·`coverImageUrl`, `Comment`(1단계 대댓글용 `parentId`), `PostLike` 전부 존재한다.

## Contract (구현 전 승인 대상)

**바꾸는 것**

- `apps/api` — `posts` 모듈에 부서활동 엔드포인트 추가
  - `GET /posts/team-activities` (목록), `GET /posts/team-activities/:id` (상세)
  - 둘 다 `OptionalJwtAuthGuard` — **게스트도 열람**한다 (큐티나눔과 동일)
  - 팀 이름 → 부서 키(`SNS팀` → `sns` 등) 매핑 상수를 서버에 두고 `department`를 내려준다. 앱의 `departmentColor.ts`가 이 값으로 칩 색을 고른다
  - 목록은 최신순. 카드가 쓰는 표시용 값(`date`·`time`·`view`·`comments`·`favorite`)을 서버가 만들어 내려준다 (큐티나눔 `dateLabel`과 같은 방식)
  - 목록에 팀 필터 쿼리(`teamId`)를 받는다 — 시안의 상단 가로 스크롤 팀 칩이 쓴다
  - 카드의 댓글 수는 **최상위 댓글만** 센다 (시안 3번째 화면: 댓글 3줄이 보이는데 헤더는 "댓글 2" — 대댓글은 수에서 빠진다)
  - 상세 조회 시 `viewCount` +1
- `apps/api` — 댓글 API 신규. 경로는 게시판과 무관하게 `/posts/:id/comments` (좋아요와 같은 자리)
  - 목록(게스트 가능) / 작성(로그인) / 삭제(내 댓글만, soft delete) / 대댓글(`parentId`, 1단계까지만)
- `packages/shared` — `TeamActivityListItem`·`TeamActivityDetail`·`CommentItem` 계약 타입 추가
- `apps/mobile` — `DepartmentActivityScreen`·`DepartmentActivityDetailScreen`의 임시 데이터를 실데이터로 교체, `features/department-activity/api.ts` 신규
  - 목록 상단에 가로 스크롤 팀 필터 칩 추가 (팀 목록은 기존 `GET /teams` 재사용)
  - 좋아요는 기존 `POST/DELETE /posts/:id/likes` 재사용
  - 상세 화면에 대댓글 표시 UI 추가 — 시안 기준 왼쪽 세로선 + 들여쓰기, 아바타·이름·시간·내용은 최상위 댓글과 같은 모양
  - 댓글 빈 상태는 기존 `CommentEmpty`("아직 댓글이 없어요…")가 시안 문구와 같아 그대로 쓴다
- `apps/api/prisma/seed.ts` — 부서활동 글·댓글 시드 추가 (실기기 확인용 데이터가 없으면 빈 화면만 보인다)
- `apps/api/test/posts.e2e-spec.ts` — 게스트 열람, 댓글 인증·소유권, 대댓글 깊이 제한 커버

**바꾸지 않는 것 (범위 밖)**

- 부서활동 **작성** 화면·API (`DepartmentActivityWriteScreen`은 목업 그대로 둔다)
- Prisma 스키마 변경 / 마이그레이션 — 기존 모델을 그대로 쓴다
- `Team`에 부서 키 컬럼 추가 — 서버 상수로 처리한다 (마이그레이션·관리자 팀 생성 화면까지 번지는 것을 피함)
- 좋아요 API — 기존 것을 그대로 쓴다
- 북마크, 댓글 수정, 2단계 이상 대댓글
- `feat/qt-board-write`의 uploads 모듈 중복 정리 — 그 브랜치에서 따로 처리

**완료 조건**

- 토큰 없이 목록·상세가 200으로 열린다
- 목록 카드의 팀 칩 색이 팀별로 다르게 나온다 (서버가 준 `department` 키 기준, 모르는 팀은 폴백 색)
- 상단 팀 칩을 고르면 그 팀 글만 남는다
- 상세를 열면 조회수가 1 오르고, 목록 카드의 조회수에 반영된다
- 댓글을 쓰면 목록에 바로 보이고, 대댓글을 1단계까지 달 수 있고, 내 댓글만 지울 수 있다
- `pnpm --filter @onnuri/api run test:e2e` 통과, `pnpm --filter @onnuri/mobile exec tsc --noEmit` 에러 0
- 실기기(dev client)에서 목록 → 상세 → 댓글 작성까지 통과

## 작업 계획

각 단계 끝에 확인 방법을 같이 적는다.

1. `packages/shared`에 계약 타입 추가 — 확인: `tsc`
2. 목록·상세 API + 팀 이름→부서 키 매핑 — 확인: e2e(게스트 200, 팀별 `department` 값, 삭제된 글 제외)
3. 상세 조회 시 조회수 +1 — 확인: e2e(상세 두 번 호출 시 값 증가)
4. 댓글 API(목록·작성·삭제·대댓글) — 확인: e2e(토큰 없이 작성 401, 남의 댓글 삭제 403, 2단계 대댓글 거부)
5. 시드에 부서활동 글·댓글 추가 — 확인: `prisma:seed` 후 목록 API 응답에 글이 보임
6. 모바일 목록 화면 연동 — 확인: `tsc`
7. 모바일 상세 화면 연동 + 댓글·대댓글 UI — 확인: `tsc`
8. 실기기에서 목록 → 상세 → 댓글·대댓글 → 좋아요 확인

## 진행 로그

- 2026-09-26: 브랜치 `feat/department-activity`를 `origin/dev`(e33cdd1)에서 생성. `pnpm install`·`prisma generate` 완료. 계획 문서 작성 (Contract 승인 대기)
- 2026-09-26: 시안 3장 수령(목록·상세 댓글0·상세 댓글2). 팀 필터 칩이 시안에 있어 범위에 추가, 댓글 수는 최상위만 센다는 것과 대댓글 모양(세로선+들여쓰기) 확정. 답글 진입점은 여전히 미정
- 2026-09-26: 1~5단계(백엔드) 완료. `packages/shared`에 `TeamActivityListItem`·`TeamActivityListResponse`·`TeamActivityDetail` 추가, `PostComment`에 `isMine`·`replies` 추가(셀 소식 매핑도 같이 맞춤). `GET /posts/team-activities`(+`teamId` 필터)·`/:id`(조회수 +1), 댓글에 `parentId`·`DELETE /posts/:id/comments/:commentId` 추가. 시드에 부서활동 4건·댓글 2건·대댓글 1건. e2e 45개 통과(부서활동 15개 신규)
- 2026-09-27: 상세 화면에서 키보드가 댓글 입력줄을 가리는 문제 수정. `KeyboardAvoidingView`를 걷어내고 `Keyboard` 이벤트로 받은 높이를 입력줄 패딩으로 넣는다 — edge-to-edge가 항상 켜져 있어 창이 줄지 않으므로(매니페스트에 `adjustResize`가 있는데도) 창 크기로 키보드를 역산하는 `KeyboardAvoidingView`가 동작하지 않는다. 같은 구성인 `CellNewsDetailScreen`·`AdminBannerFormScreen`·`AdminCellFormScreen`·`AdminMemberEditScreen`도 같은 문제가 있을 것으로 보이나 범위 밖이라 두었다
- 2026-09-26: 6~7단계(모바일) 완료. `features/department-activity/api.ts` 신규, 목록은 `FilterBar`로 팀 필터(맨 앞 "전체") + 실데이터, 상세는 실데이터 + 좋아요 토글 + 댓글/대댓글 + 답글 모드. 공용 `CommentItem`에 선택 prop `onReplyPress`·`onDeletePress` 추가(안 주면 기존 화면 그대로). `tsc --noEmit` 에러 0. 실기기 확인만 남음

## 열린 질문 / 리스크

- **답글을 다는 진입점이 시안에 없다.** 대댓글이 달린 모양(세로선 + 들여쓰기)은 3번째 화면에 있지만, "답글" 버튼이 어디에도 없다. 댓글을 탭하는 건지, 길게 누르는 건지, 하단 입력창이 답글 모드로 바뀌는지 확인 필요
- **선택된 필터 칩 스타일이 기존 `Chip`에 없다.** 시안의 선택 칩은 `primary.normal`(#276E4C) 채움 + 흰 글씨인데, `Chip`의 `primary`는 흰 배경 + 어두운 글자라 다르다. 칩 색을 추가할지 필터 전용 컴포넌트를 둘지 결정 필요
- 필터에 "전체" 칩이 없고 첫 칩(디자인팀)이 선택된 상태인데, 카드 목록에는 여러 팀 글이 섞여 있어 시안 안에서 어긋난다. 기본값이 전체인지, 첫 팀인지 확인 필요
- 목록 페이지네이션 없이 최신순 전체로 시작한다. 글이 쌓이면 필요해진다 (`packages/shared`에 `PaginatedResult`가 이미 있다)
- 조회수는 같은 사람이 여러 번 열면 계속 오른다. 중복 방지를 넣지 않는 게 맞는지 확인 필요
- 요청자(Jira Reporter)를 채워야 한다

## 승인 로그

| 날짜 | 승인자 | 코멘트 |
| --- | --- | --- |
| | | |
