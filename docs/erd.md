# ERD (목표 설계)

> **상태: 결정 반영 (2026-09-01)** — [attendance-data-model.md](attendance-data-model.md)의 미결 중 팀장 표현·소속 팀 이력·셀모임 주기는 아래 구조로 확정했다. 남은 미결(문서 §6)이 확정되면 함께 갱신한다.

현재 [schema.prisma](../apps/api/prisma/schema.prisma)의 모델(User/Team/Post)을 대체할 전체 데이터 모델이다.
셀·출석 관련 모델은 **아직 구현 전**이며, QR 출석·엑셀 추출은 MVP 이후 기능이다.

## 1. 회원·조직

```mermaid
erDiagram
    User ||--o{ SocialAccount : "로그인 수단"
    User ||--o{ TeamMembership : "소속"
    Team ||--o{ TeamMembership : "구성"
    User ||--o{ CellMembership : "소속"
    Cell ||--o{ CellMembership : "구성"

    User {
        string id PK "cuid"
        string email UK "소셜 로그인에서"
        string name
        date birthDate "생년월일 (화면 기준 전체 수집 — 개인정보 동의 필요, 문서 §6)"
        string gender
        string avatarUrl "nullable"
        string intro "한 줄 소개 (nullable)"
        boolean isAdmin "임원 수동 지정 (회원가입으로 못 얻음)"
        boolean notifySermonUpload "설정 토글: 말씀영상 업로드"
        boolean notifyLiveWorship "설정 토글: 실시간 예배 시작"
        boolean notifyQtNewPost "설정 토글: 큐티나눔 새글"
        datetime withdrawnAt "탈퇴 soft delete — 출석·게시글 이력 보존"
        datetime createdAt
        datetime updatedAt
    }

    SocialAccount {
        string id PK
        string userId FK
        string provider "KAKAO / GOOGLE (providerUid와 복합 유니크)"
        string providerUid
    }

    Team {
        string id PK
        string name UK "7팀 (찬양·디자인·방송·영상·중보기도·풋살·SNS)"
        string coverImageUrl "배경사진 (nullable)"
        string intro "팀 소개 (nullable)"
    }

    TeamMembership {
        string id PK
        string userId FK
        string teamId FK
        TeamRole role "LEADER(팀장) / MEMBER(팀원) — 승격은 관리자만"
        date startedAt
        date endedAt "nullable = 진행 중"
    }

    Cell {
        string id PK
        string name "예: 누리셀"
        string coverImageUrl "단체 사진 (402x402 커버, nullable)"
        date startedAt "생성일"
        date expiresAt "유통기한(활동 종료 예정일) — 자연 만료 시 삭제가 아니라 종료 처리(기록 보존)"
        datetime deletedAt "관리자 강제 삭제 soft delete — 삭제 시 출석 기록 처리 방침 미정"
    }

    CellMembership {
        string id PK
        string userId FK
        string cellId FK
        CellRole role "LEADER(셀장) / SUB_LEADER(부셀장, 셀장과 동일 권한) / MEMBER(셀원)"
        date startedAt
        date endedAt "nullable = 진행 중"
    }
```

- 게스트(비로그인)는 DB에 행을 만들지 않는다.
- 셀장+부셀장 합쳐 최대 2명, 동시 활성 셀/팀 멤버십은 1개 — 구조가 아니라 앱 로직으로 보장한다.
- 셀·팀 생성/삭제는 관리자 전용. 승격된 셀장/팀장은 자기 페이지 수정만 가능하다.

## 2. 예배·출석·셀 관리

```mermaid
erDiagram
    WorshipService ||--o{ WorshipAttendance : "예배 출석"
    User ||--o{ WorshipAttendance : ""
    Cell ||--o{ CellMeeting : "셀모임"
    WorshipService |o--o{ CellMeeting : "그 주 회차"
    CellMeeting ||--o{ CellMeetingAttendance : "셀모임 출석"
    User ||--o{ CellMeetingAttendance : ""
    CellMeeting ||--o| FollowerNote : "주간 보고"
    FollowerNote ||--o{ FollowerNoteComment : "목사님 댓글"
    SermonSeries ||--o{ Sermon : "월별 시리즈"
    WorshipService ||--o| Sermon : "1:1"

    WorshipService {
        string id PK
        date date UK "예배일(일요일)"
        string name "예: 4부 청년 주일예배"
        string qrToken "QR 출석용 (MVP 이후)"
        datetime qrDeadline "마감시각 — 미확정 (문서 §6)"
    }

    WorshipAttendance {
        string id PK
        string userId FK "serviceId와 복합 유니크"
        string serviceId FK
        datetime checkedAt "QR 체크 시각"
    }

    CellMeeting {
        string id PK
        string cellId FK
        string serviceId FK "셀모임 날짜 = 그 주 일요일. 행이 없는 주는 모임 '없음'(결석 아님)"
    }

    CellMeetingAttendance {
        string id PK
        string meetingId FK "userId와 복합 유니크"
        string userId FK
        string checkedById FK "기록한 셀장/부셀장"
    }

    FollowerNote {
        string id PK
        string meetingId FK "노트 날짜 = 그 셀모임의 일요일"
        string authorId FK "셀장/부셀장"
        string answer1 "문항1: 요즘 상황과 기도제목"
        string answer2 "문항2: 나눔 중 함께 이야기하면 좋을 것"
        string answer3 "문항3: 궁금한 점이나 하고 싶은 말"
        datetime createdAt "작성은 일~금 (토요일 전 마감)"
    }

    FollowerNoteComment {
        string id PK
        string noteId FK
        string authorId FK "관리자 — 화면에 '목사님 댓글'로 표시"
        string content
        datetime createdAt
    }

    SermonSeries {
        string id PK
        string title
        string month "월별"
    }

    Sermon {
        string id PK
        string seriesId FK
        string serviceId FK "UK — 예배 회차와 1:1"
        string title
        string passage "본문"
        string preacher
        string videoUrl "유튜브 API 자동 인입"
        boolean isLive
        datetime deletedAt "잘못 인입된 영상 관리자 삭제 (soft delete)"
    }
```

- **출석은 행 존재 = 참석(O), 없음 = 결석(X)** 으로 계산한다. 문서의 O/X 표기(예배/셀모임)와 통계는 조회 시 계산 — [attendance-data-model.md §5](attendance-data-model.md).
- 팔로워 노트 열람은 본인 셀 셀장·부셀장 + 관리자만 (게시판이 아니라 셀 관리 기록이라 Post에 넣지 않는다).

## 3. 게시판 (공용 Post + 게시판별 확장)

```mermaid
erDiagram
    User ||--o{ Post : "작성"
    Post ||--o| QtShare : "큐티나눔"
    Post ||--o| PrayerRequest : "기도제목"
    Post ||--o| HobbyGroup : "취향 소그룹"
    HobbyGroup ||--o{ HobbyGroupMember : "참여 멤버"
    Post ||--o{ Comment : ""
    Post ||--o{ PostLike : "하트"
    Post ||--o{ Bookmark : "북마크"

    Post {
        string id PK
        BoardType board "QT_SHARE / CELL_NEWS(셀 소식) / TEAM_ACTIVITY(부서활동) / HOBBY_GROUP / PRAYER"
        string authorId FK "익명 글도 항상 저장 — 관리자는 익명 작성자 확인 가능"
        string cellId FK "nullable — 셀 소식일 때"
        string teamId FK "nullable — 부서활동일 때"
        string title "nullable"
        string content
        int viewCount
        boolean isPinned
        datetime deletedAt "작성자 본인 또는 관리자 삭제 (soft delete)"
        datetime createdAt
        datetime updatedAt
    }

    QtShare {
        string postId PK "FK"
        date shareDate "나눔 날짜"
        string passage "말씀 구절"
    }

    PrayerRequest {
        string postId PK "FK"
        int number "표시용 등록 번호 (No.128) — 자동 증가, 삭제돼도 안 바뀜"
        boolean isAnonymous
        string category
        date visibleUntil "공개기간"
    }

    HobbyGroup {
        string postId PK "FK"
        date recruitStart
        date recruitEnd
        string meetAt "모임일"
        string place
        string cost
        GroupStatus status "OPEN / CLOSED"
    }

    HobbyGroupMember {
        string id PK
        string postId FK "userId와 복합 유니크"
        string userId FK
    }

    Comment {
        string id PK
        string postId FK
        string authorId FK
        string content
        datetime createdAt
    }

    PostLike {
        string id PK
        string postId FK "userId와 복합 유니크"
        string userId FK
    }

    Bookmark {
        string id PK
        string postId FK "userId와 복합 유니크 — 기도제목 북마크"
        string userId FK
    }
```

- 공용 Post로 묶는 이유: 댓글·하트·북마크·이미지·조회수가 Post 하나만 참조하면 되고, **관리자의 "모든 게시물 삭제"·"받은 하트 수" 같은 횡단 기능**이 한 곳에서 구현된다. (Prisma는 다형 관계 미지원 → 게시판별 고유 필드는 1:1 확장 테이블로.)

## 4. 공용·기타

```mermaid
erDiagram
    Image {
        string id PK
        string url
        string uploaderId FK
        string postId FK "nullable — 게시글 첨부"
        string cellId FK "nullable — 셀 갤러리 직접 업로드"
        string teamId FK "nullable — 팀 갤러리 직접 업로드"
        string serviceId FK "nullable — 주보·나눔지"
        datetime createdAt
    }

    Notification {
        string id PK
        string userId FK "수신자"
        string type
        string title
        string link
        datetime readAt "nullable = 안 읽음"
        datetime createdAt
    }

    Notice {
        string id PK
        NoticeType type "NOTICE(공지사항) / BANNER(홈 배너 — 예: 여름수련회)"
        string title
        string content
        string imageUrl "nullable"
        datetime createdAt
    }
```

- 갤러리는 "그 셀/팀 게시글 사진 + 직접 올린 사진"을 합쳐 월별로 보여준다. **게시글 사진 자동 포함 여부는 디자이너 확인 중** — 어느 쪽이든 구조는 그대로고 조회 규칙만 달라진다.

## 설계 메모 (결정 근거)

- **팀 소속도 셀과 같은 멤버십 구조** — 팀원 관리 화면(추가/삭제)과 맞고, "소속 팀 이력" 미결이 같이 해결된다. 팀장 = `TeamMembership.role = LEADER`, 셀장 = `CellMembership.role = LEADER`. 별도 등급 enum이 없어졌고, 승격/강등 = 관리자가 멤버십 역할을 바꾸는 것.
- **예배 회차(`WorshipService`)를 엔티티로 분리** — 설교·영상·주보·QR·실시간 예배가 전부 매주 예배일에 붙으므로 자연스럽게 연결되고, `CellMeeting` 분리로 "셀모임 없는 주"가 결석이 아니라 자동으로 '없음'이 된다.
- **문서 vs 화면이 다른 곳은 화면 기준** — 생년월일 전체(DATE), 부셀장 역할, 배경사진·소개 컬럼. 화면이 더 최신·구체적이다.
- **저장하지 않고 계산하는 것**: 나이, 출석 횟수·주수, 큐티나눔 수, 받은 하트 수 (근거: [attendance-data-model.md §5](attendance-data-model.md)).
- 회원탈퇴·게시글 삭제·셀 삭제는 soft delete — 출석·이력이 끊기지 않게.

## 미결 (구조에 영향 없어 진행 가능, 확정 시 갱신)

- QR 마감 시각 / 셀장 권한 범위 — 출석 관리 화면 안내문("QR 찍으면 셀모임까지 자동 체크")이 문서 §2 흐름(셀모임 기본 X, 셀장이 체크)과 상충. 회의에서 확정 필요.
- 갤러리에 게시글 사진 자동 포함 여부 — 디자이너 확인.
- 부서활동 게시판 업로드를 팀장 전용으로 제한할지.
- 셀 강제 삭제 시 출석 기록 처리.
