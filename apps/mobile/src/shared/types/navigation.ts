export type RootTabParamList = {
  Home: undefined;
  TeamStory: undefined;
  Sermon: undefined;
  Bulletin: undefined;
  MyPage: undefined;
};

// 메인 탭(BottomTabNavigator)을 하나의 스크린으로 품는 루트 스택. 로그인 상태일 때만 마운트된다.
// 큐티나눔·실시간예배는 하단 탭이 아니라 홈에서 진입하는 서브 화면이라 여기서 push한다.
export type RootStackParamList = {
  Main: undefined;
  QtBoard: undefined;
  Live: undefined;
};

// 비로그인 상태일 때 마운트되는 스택. 모든 화면이 로그인을 요구하므로 Login만 있다.
export type AuthStackParamList = {
  Login: undefined;
};
