# ERD (목표 설계)

> **상태: 확정 (2026-09-02)** — [attendance-data-model.md](attendance-data-model.md)의 미결 중 팀장 표현·소속 팀 이력·셀모임 주기는 아래 구조로 확정했고, 출석 기록 방식도 attended+기록자 저장으로 확정했다. 남은 미결(문서 §6)이 확정되면 함께 갱신한다.

이 문서는 [schema.prisma](../apps/api/prisma/schema.prisma)로 **구현되어 있다** — 스키마를 바꾸면 이 문서도 같은 턴에 갱신한다.
기존 이메일/비밀번호 인증이 참조하는 레거시 필드(`User.password`·`cellName`·`teamId`·`role`)는 소셜 로그인 전환 시 제거 예정이라 스키마에만 있고 이 문서에는 표기하지 않는다. 생성·수정 시각(`createdAt`/`updatedAt`)도 다이어그램에서는 대부분 생략한다 — 스키마에는 전 테이블에 있다. QR 출석·엑셀 추출은 MVP 이후 기능이다.

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
        string phone "연락처 — 프로필 직접 입력, 본인인증 없음 (nullable)"
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
        string iconUrl "팀스토리 목록 아이콘 (nullable)"
        string coverImageUrl "배경사진 (nullable)"
        string tagline "한 줄 소개 — 목록에 표시 (nullable)"
        string description "팀 소개 (nullable)"
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
        datetime deletedAt "관리자 강제 삭제 soft delete — 출석 기록은 보존 (2026-09-04 확정)"
        string createdById FK "생성한 관리자"
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
        datetime startsAt "예배 시작 시각 (nullable)"
        string qrToken "QR 출석용 (MVP 이후)"
        datetime qrOpensAt "QR 시작 12:00 (2026-09-04 확정, nullable)"
        datetime qrClosesAt "QR 마감 14:30 (2026-09-04 확정, nullable)"
    }

    WorshipAttendance {
        string id PK
        string userId FK "serviceId와 복합 유니크"
        string serviceId FK
        boolean attended "기본 true. false = 명시적 결석 처리(QR 오스캔 정정)"
        AttendanceMethod method "QR / MANUAL"
        string recordedById FK "MANUAL일 때 기록자 (nullable)"
        datetime checkedAt "QR 체크 시각"
    }

    CellMeeting {
        string id PK
        string cellId FK
        string serviceId FK "셀모임 날짜 = 그 주 일요일. 행이 없는 주는 모임 '없음'(결석 아님)"
        string createdById FK "등록한 셀장 (nullable)"
    }

    CellMeetingAttendance {
        string id PK
        string meetingId FK "userId와 복합 유니크"
        string userId FK
        boolean attended "기본 true. false = 명시적 불참 정정"
        string recordedById FK "기록한 셀장/부셀장"
        datetime recordedAt
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
        string parentId FK "대댓글 부모 — 1단계만. 목사님 댓글에 셀장이 답변 (nullable)"
        string content
        datetime createdAt
    }

    SermonSeries {
        string id PK
        string title
        string description "예: 산상수훈을 따라가는 8월 (nullable)"
        date month "시리즈 월 (해당 월 1일)"
        string coverImageUrl "nullable"
    }

    Sermon {
        string id PK
        string seriesId FK
        string serviceId FK "UK — 예배 회차와 1:1"
        string title
        string passage "본문"
        string preacher
        string videoUrl "유튜브 API 자동 인입"
        string thumbnailUrl "nullable"
        boolean isLive
        int viewCount
        datetime deletedAt "잘못 인입된 영상 관리자 삭제 (soft delete)"
    }
```

- **출석은 행 존재 = 참석(O), 없음 = 결석(X)** 으로 계산한다. 정정을 위해 `attended`(false = 명시적 결석 처리)와 기록자(`recordedById`)를 저장하고, 예배 출석은 기록 방식(`method`: QR/수동)도 남긴다 — QR 오스캔을 행 삭제 없이 정정할 수 있고 누가 기록했는지 이력이 남는다. 셀모임 출석은 항상 셀장이 기록하므로 method 없이 기록자만 저장한다. O/X 표기와 통계는 조회 시 계산 — [attendance-data-model.md §5](attendance-data-model.md).
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
        date eventDate "큐티·소식·활동 날짜 — 갤러리 월별 그룹 기준 (nullable)"
        string coverImageUrl "큐티 배경 / 소식·부서활동 상단 / 소그룹 대표 이미지 (nullable)"
        int viewCount
        boolean isPinned
        datetime deletedAt "작성자 본인 또는 관리자 삭제 (soft delete)"
        datetime createdAt
        datetime updatedAt
    }

    QtShare {
        string postId PK "FK"
        string passage "말씀 구절 — 나눔 날짜는 Post.eventDate"
    }

    PrayerRequest {
        string postId PK "FK"
        int number "표시용 등록 번호 (No.128) — 자동 증가, 삭제돼도 안 바뀜"
        boolean isAnonymous
        PrayerCategory category "개인·영성 / 건강·일상 / 관계·공동체 / 중보·섬김 / 기타"
        date visibleUntil "공개기간"
    }

    HobbyGroup {
        string postId PK "FK"
        date recruitStart
        date recruitEnd
        string meetingSchedule "모임일 (매주 토요일 6시)"
        string place
        string cost
        HobbyGroupStatus status "RECRUITING(모집중) / CLOSED(마감)"
    }

    HobbyGroupMember {
        string id PK
        string postId FK "userId와 복합 유니크"
        string userId FK
        datetime joinedAt
    }

    Comment {
        string id PK
        string postId FK
        string authorId FK
        string parentId FK "대댓글 부모 — 1단계만. 취향 소그룹·부서활동에서 사용 (nullable)"
        string content
        datetime deletedAt "작성자/관리자 삭제 soft delete (nullable)"
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
        ImageKind kind "POST_CONTENT / GALLERY / BULLETIN(주보) / HANDOUT(나눔지)"
        string uploadedById FK
        string postId FK "nullable — 게시글 첨부"
        string cellId FK "nullable — 셀 갤러리 직접 업로드"
        string teamId FK "nullable — 팀 갤러리 직접 업로드"
        string serviceId FK "nullable — 주보·나눔지"
        date takenOn "갤러리 월별 그룹 기준 — 게시글 첨부면 Post.eventDate, 직접 업로드면 업로드일 (nullable)"
        int sortOrder
        datetime createdAt
    }

    Notification {
        string id PK
        string userId FK "수신자"
        NotificationType type "팔로워노트/말씀업로드/라이브/큐티새글/댓글/하트/공지"
        string title "알림 화면 상단 라벨"
        string body "예: 이서연 셀장님이 누리셀 팔로워 노트를 작성했어요."
        string linkUrl "탭하면 이동할 딥링크 (nullable)"
        datetime readAt "nullable = 안 읽음"
        datetime createdAt
    }

    Notice {
        string id PK
        NoticeType type "NOTICE(공지사항) / BANNER(홈 배너 — 예: 여름수련회)"
        string title
        string content "nullable"
        string imageUrl "배너/상세 이미지 (nullable)"
        string linkUrl "nullable"
        date startsOn "배너 노출 시작 (nullable)"
        date endsOn "배너 노출 종료 (nullable)"
        string authorId FK "관리자"
        datetime createdAt
    }
```

- 갤러리는 "그 셀/팀 게시글 사진 + 직접 올린 사진"을 합쳐 월별로 보여준다. **게시글 사진 자동 포함 확정 (2026-09-04)** — 반드시 소속에 맞게 매칭한다: A셀 소식(`Post.cellId=A`)의 첨부는 A셀 갤러리에만, B팀 부서활동(`Post.teamId=B`)의 첨부는 B팀 갤러리에만 노출된다.

## 설계 메모 (결정 근거)

- **팀 소속도 셀과 같은 멤버십 구조** — 팀원 관리 화면(추가/삭제)과 맞고, "소속 팀 이력" 미결이 같이 해결된다. 팀장 = `TeamMembership.role = LEADER`, 셀장 = `CellMembership.role = LEADER`. 별도 등급 enum이 없어졌고, 승격/강등 = 관리자가 멤버십 역할을 바꾸는 것.
- **예배 회차(`WorshipService`)를 엔티티로 분리** — 설교·영상·주보·QR·실시간 예배가 전부 매주 예배일에 붙으므로 자연스럽게 연결되고, `CellMeeting` 분리로 "셀모임 없는 주"가 결석이 아니라 자동으로 '없음'이 된다.
- **문서 vs 화면이 다른 곳은 화면 기준** — 생년월일 전체(DATE), 부셀장 역할, 배경사진·소개 컬럼. 화면이 더 최신·구체적이다.
- **저장하지 않고 계산하는 것**: 나이, 출석 횟수·주수, 큐티나눔 수, 받은 하트 수 (근거: [attendance-data-model.md §5](attendance-data-model.md)).
- 회원탈퇴·게시글 삭제·셀 삭제는 soft delete — 출석·이력이 끊기지 않게. **보관 기간 (2026-09-03 확정)**: 회원 탈퇴는 30일 후 개인정보 파기하되 출석 기록은 익명화해 보존(통계용), 게시글·댓글은 당분간 무기한 보관(정리 배치는 필요해질 때 추가). 출시 전 개인정보처리방침에 명시할 것.

## 미결 (구조에 영향 없어 진행 가능, 확정 시 갱신)

- ~~QR 자동 체크 상충~~ → **확정 (2026-09-03): QR은 예배 출석만 기록한다.** 셀모임은 기본 결석이고, 셀장이 출석 관리 화면에서 온 사람을 직접 체크한다 — 그 주 예배 QR 명단을 참고로 표시해주면 확인이 빠르다. 화면 안내문("QR 찍으면 셀모임까지 자동 체크")은 화면 쪽을 이 흐름에 맞게 고친다.
- ~~QR 마감 시각~~ → **확정 (2026-09-04): QR 유효 시간 12:00~14:30** (`WorshipService.qrOpensAt`/`qrClosesAt`).
- ~~갤러리 게시글 사진 자동 포함~~ → **확정 (2026-09-04): 자동 포함** — 위 §4 매칭 규칙 참고. 디자이너에게 공유할 것.
- ~~부서활동 게시판 업로드 권한~~ → **확정 (2026-09-03): 해당 팀 소속 팀원 모두 작성 가능.**
- ~~셀 강제 삭제 시 출석 기록 처리~~ → **확정 (2026-09-04): 기록 보존** — 셀은 soft delete로 숨기고 출석·팔로워 노트 기록은 남긴다(통계·엑셀 유지, 표시는 "(삭제된 셀)").
