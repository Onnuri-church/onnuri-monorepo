export type RootTabParamList = {
  Home: undefined;
  TeamStory: undefined;
  Sermon: undefined;
  Cell: undefined;
  MyPage: undefined;
};

// 메인 탭(BottomTabNavigator)을 하나의 스크린으로 품는 루트 스택. 로그인 상태일 때만 마운트된다.
// 큐티나눔·실시간예배·오늘 주보는 하단 탭이 아니라 홈에서 진입하는 서브 화면이라 여기서 push한다.
// QR도 탭이 아니라 메인 헤더의 QR 버튼에서 push한다 — 하단 탭 가운데 자리는 말씀이 쓴다.
export type RootStackParamList = {
  Main: undefined;
  QtBoard: undefined;
  QtBoardDetail: { id: string };
  QtBoardWrite: undefined;
  Live: undefined;
  Qr: undefined;
  // QR을 찍은 뒤 보는 결과. duplicate면 "이미 출석했다" 안내로 바뀐다 —
  // 두 화면이 배치가 같고 아이콘·문구·카드 행만 달라서 라우트를 나누지 않는다.
  QrResult: { duplicate: boolean };
  // 말씀 탭에서 카드를 눌러 들어가는 설교영상 상세. 탭 밖으로 push된다.
  SermonDetail: { id: string };
  Bulletin: undefined;
  DepartmentActivity: undefined;
  DepartmentActivityDetail: { id: string };
  DepartmentActivityWrite: undefined;
  GroupMeeting: undefined;
  GroupMeetingDetail: { id: string };
  PrayerBoard: undefined;
  // 게시판 ⋮ 메뉴에서 들어가는 내 북마크 목록. 게시판과 화면이 비슷하지만 라우트를 나눈다 —
  // 무엇을 여는지 이름으로 드러나야 딥링크·화면 로그가 둘을 구분한다.
  PrayerBookmarks: undefined;
  PrayerMine: undefined;
  PrayerBoardDetail: { id: string };
  // id가 있으면 수정 모드 — 기존 글 내용을 채운 채 열린다 (내 기도제목의 수정 버튼에서 진입).
  PrayerWrite: { id: string } | undefined;
  // 주보와 나눔지는 화면이 같지만 라우트는 나눈다 — 이름이 무엇을 여는지 그대로 말해야
  // 딥링크·화면 로그가 둘을 구분할 수 있다. 같은 부분은 shared의 ImagePager가 갖고 있다.
  BulletinDetail: { id: string };
  SharingSheet: { id: string };
  // 주보 목록의 + 버튼에서 진입한다. 한 화면에서 그 주차의 주보와 나눔지를 같이 올린다.
  BulletinWrite: undefined;
  TeamStoryDetail: { teamId: string };
  // 팀을 만들고 고치고 지우는 관리 화면. 시안은 팀스토리 화면의 관리자 모드지만
  // 등급 판별이 아직 없어 별도 라우트로 둔다.
  TeamAdmin: undefined;
  // teamId가 있으면 편집 모드 — 기존 팀 정보를 채운 채 열린다 (PrayerWrite와 같은 방식).
  TeamForm: { teamId: string } | undefined;
  TeamStoryGallery: { teamId: string };
  TeamStoryPhotoViewer: { teamId: string; photoId: string };
  // 팀 상세에서 "외 N명 더 보기"로 진입한다.
  TeamMemberList: { teamId: string };
  // 마이페이지(팀장)에서 진입하는 팀원 관리·추가. 조회 전용인 TeamMemberList와 라우트를 나눈다 —
  // 무엇을 여는지 이름으로 드러나야 딥링크·화면 로그가 둘을 구분한다.
  TeamMemberAdmin: { teamId: string };
  TeamMemberAdd: { teamId: string };
  // 전체 셀 목록(하단 탭)에서 셀을 고르면 진입하는 개별 셀 페이지 (소식/갤러리/구성원/관리 4탭).
  // 셀은 관리자가 만들고 종료하는 유동 데이터라 화면 하나가 cellId로 어떤 셀이든 그린다.
  CellDetail: { cellId: string };
  CellNewsDetail: { cellId: string; newsId: string };
  CellNewsWrite: { cellId: string };
  // 갤러리 사진 뷰어. index는 월 섹션을 이어붙인 평탄화 순번이다.
  CellGalleryPhoto: { cellId: string; index: number };
  // 관리 탭에서 진입하는 셀장·관리자 전용 화면들.
  CellAttendance: { cellId: string };
  FollowerNoteBoard: { cellId: string };
  FollowerNoteWrite: { cellId: string };
  FollowerNoteDetail: { cellId: string; noteId: string };
  // 마이페이지 상단 액션 바의 설정 버튼에서 진입한다.
  Settings: undefined;
  // 설정 > 회원 정보 수정. 회원가입용 ProfileSetupScreen을 재사용한다 —
  // 라우트를 나누는 이유는 딥링크·화면 로그가 가입과 수정을 구분하기 위해서다.
  ProfileEdit: undefined;
};

// 로그인도 게스트도 아닌 상태(unauthenticated)일 때 마운트되는 스택.
// ProfileSetup은 원래 로그인 응답(프로필 입력 여부)에 따라 분기될 화면인데, 백엔드가 없어서
// 지금은 소셜 로그인 버튼에서 무조건 push한다 — 화면을 눌러보기 위한 임시 배선이다.
export type AuthStackParamList = {
  Login: undefined;
  ProfileSetup: undefined;
};
