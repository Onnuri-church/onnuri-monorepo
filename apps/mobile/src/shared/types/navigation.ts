export type RootTabParamList = {
  Home: undefined;
  TeamStory: undefined;
  Qr: undefined;
  Cell: undefined;
  MyPage: undefined;
};

// 메인 탭(BottomTabNavigator)을 하나의 스크린으로 품는 루트 스택. 로그인 상태일 때만 마운트된다.
// 큐티나눔·실시간예배·말씀·오늘 주보는 하단 탭이 아니라 홈에서 진입하는 서브 화면이라 여기서 push한다.
// (말씀·주보는 원래 탭이었는데 시안에서 QR·셀 페이지에 자리를 내주고 홈 바로가기로 내려왔다.)
export type RootStackParamList = {
  Main: undefined;
  QtBoard: undefined;
  QtBoardDetail: { id: string };
  QtBoardWrite: undefined;
  Live: undefined;
  Sermon: undefined;
  Bulletin: undefined;
  DepartmentActivity: undefined;
  DepartmentActivityDetail: { id: string };
  GroupMeeting: undefined;
  GroupMeetingDetail: { id: string };
  PrayerBoard: undefined;
  // 주보와 나눔지는 화면이 같지만 라우트는 나눈다 — 이름이 무엇을 여는지 그대로 말해야
  // 딥링크·화면 로그가 둘을 구분할 수 있다. 같은 부분은 shared의 ImagePager가 갖고 있다.
  BulletinDetail: { id: string };
  SharingSheet: { id: string };
};

// 로그인도 게스트도 아닌 상태(unauthenticated)일 때 마운트되는 스택.
// ProfileSetup은 원래 로그인 응답(프로필 입력 여부)에 따라 분기될 화면인데, 백엔드가 없어서
// 지금은 소셜 로그인 버튼에서 무조건 push한다 — 화면을 눌러보기 위한 임시 배선이다.
export type AuthStackParamList = {
  Login: undefined;
  ProfileSetup: undefined;
};
