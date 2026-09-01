import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { LoginScreen } from "../features/auth/LoginScreen";
import { BulletinDetailScreen } from "../features/bulletin/BulletinDetailScreen";
import { CellAttendanceScreen } from "../features/cell/CellAttendanceScreen";
import { CellDetailScreen } from "../features/cell/CellDetailScreen";
import { CellGalleryPhotoScreen } from "../features/cell/CellGalleryPhotoScreen";
import { CellNewsDetailScreen } from "../features/cell/CellNewsDetailScreen";
import { CellNewsWriteScreen } from "../features/cell/CellNewsWriteScreen";
import { FollowerNoteBoardScreen } from "../features/cell/FollowerNoteBoardScreen";
import { FollowerNoteDetailScreen } from "../features/cell/FollowerNoteDetailScreen";
import { FollowerNoteWriteScreen } from "../features/cell/FollowerNoteWriteScreen";
import { findCell } from "../features/cell/cells";
import { BulletinScreen } from "../features/bulletin/BulletinScreen";
import { BulletinWriteScreen } from "../features/bulletin/BulletinWriteScreen";
import { SharingSheetScreen } from "../features/bulletin/SharingSheetScreen";
import { DepartmentActivityDetailScreen } from "../features/department-activity/DepartmentActivityDetailScreen";
import { DepartmentActivityScreen } from "../features/department-activity/DepartmentActivityScreen";
import { GroupMeetingDetailScreen } from "../features/group-meeting/GroupMeetingDetailScreen";
import { GroupMeetingScreen } from "../features/group-meeting/GroupMeetingScreen";
import { LiveScreen } from "../features/live/LiveScreen";
import { MyPrayerScreen } from "../features/prayer-board/MyPrayerScreen";
import { PrayerBookmarkScreen } from "../features/prayer-board/PrayerBookmarkScreen";
import { PrayerBoardScreen } from "../features/prayer-board/PrayerBoardScreen";
import { PrayerDetailScreen } from "../features/prayer-board/PrayerDetailScreen";
import { PrayerWriteScreen } from "../features/prayer-board/PrayerWriteScreen";
import { ProfileSetupScreen } from "../features/profile/ProfileSetupScreen";
import { QrScreen } from "../features/qr/QrScreen";
import { QtBoardDetailScreen } from "../features/qt-board/QtBoardDetailScreen";
import { QtBoardScreen } from "../features/qt-board/QtBoardScreen";
import { SermonDetailScreen } from "../features/sermon/SermonDetailScreen";
import { SettingsScreen } from "../features/settings/SettingsScreen";
import { SplashScreen } from "../features/splash/SplashScreen";
import { TeamMemberListScreen } from "../features/team-story/TeamMemberListScreen";
import { TeamAdminScreen } from "../features/team-story/TeamAdminScreen";
import { TeamFormScreen } from "../features/team-story/TeamFormScreen";
import { TeamStoryDetailScreen } from "../features/team-story/TeamStoryDetailScreen";
import { TeamStoryGalleryScreen } from "../features/team-story/TeamStoryGalleryScreen";
import { TeamStoryPhotoViewerScreen } from "../features/team-story/TeamStoryPhotoViewerScreen";
import { findTeam } from "../features/team-story/teams";
import { Header } from "../shared/components/base/Header";
import { useAppBootstrap } from "../shared/hooks/useAppBootstrap";
import { useAuthStore } from "../shared/store/useAuthStore";
import type { AuthStackParamList, RootStackParamList } from "../shared/types/navigation";
import { BottomTabNavigator } from "./BottomTabNavigator";
import {QtBoardWriteScreen} from "../features/qt-board/QtBoardWriteScreen";
import {DepartmentActivityWriteScreen} from "../features/department-activity/DepartmentActivityWriteScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

// 세션 상태로 트리 전체를 분기한다. 세션이 없어지면(로그아웃, 401로 인한 clearSession)
// 자동으로 로그인 화면으로 전환된다.
// 게스트(로그인 없이 둘러보기)는 로그인한 유저와 같은 스택을 본다 — 화면 단위로 트리를 나누지 않고,
// 게스트가 못 하는 동작(작성·마이페이지 등)은 각 화면이 자기 자리에서 막는다. 자세한 건
// ARCHITECTURE.md의 Access Model 참고.
//
// 준비가 끝나기 전(status: loading)에는 스플래시를 NavigationContainer 바깥에서 그린다 —
// 스플래시는 뒤로가기로 돌아갈 수 있으면 안 되고 네비게이션도 쓰지 않아서, 스크린으로 등록하는 대신
// 트리를 통째로 대신한다. 온보딩처럼 여러 화면이 붙는 날이 오면 그때 별도 Stack으로 올린다.
export function RootNavigator() {
  const session = useAuthStore((state) => state.session);

  useAppBootstrap();

  if (session.status === "loading") {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      {session.status === "authenticated" || session.status === "guest" ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={BottomTabNavigator} />
          <Stack.Screen
            name="QtBoard"
            component={QtBoardScreen}
            options={{
              headerShown: true,
              header: () => <Header variant="sub" title="큐티나눔" rightAction="home" />,
            }}
          />
          <Stack.Screen
              name="QtBoardWrite"
              component={QtBoardWriteScreen}
              options={{ headerShown: true, header: () => <Header variant="sub" title="큐티나눔 글쓰기" /> }}
          />
          <Stack.Screen
            name="QtBoardDetail"
            component={QtBoardDetailScreen}
            // 헤더는 화면이 단독 등록한다 (⋮ 노출·항목이 글 작성자에 의존) — 여기 header를 두면 이중 정의.
            options={{ headerShown: true }}
          />
          <Stack.Screen
            name="BulletinDetail"
            component={BulletinDetailScreen}
            options={{
              headerShown: true,
              header: () => <Header variant="sub" title="주보" rightAction="export" />,
            }}
          />
          <Stack.Screen
            name="SharingSheet"
            component={SharingSheetScreen}
            options={{
              headerShown: true,
              header: () => <Header variant="sub" title="나눔지" rightAction="export" />,
            }}
          />
          <Stack.Screen
            name="SermonDetail"
            component={SermonDetailScreen}
            options={{
              headerShown: true,
              header: () => <Header variant="sub" title="" rightAction="none" />,
            }}
          />
          <Stack.Screen
            name="BulletinWrite"
            component={BulletinWriteScreen}
            options={{
              headerShown: true,
              header: () => <Header variant="sub" title="주보/나눔지 업로드" rightAction="none" />,
            }}
          />
          <Stack.Screen
            name="Live"
            component={LiveScreen}
            options={{
              headerShown: true,
              header: () => <Header variant="sub" title="실시간 예배" />,
            }}
          />
          {/* QR은 하단 탭이 아니라 메인 헤더의 QR 버튼에서 들어온다 (시안의 탭 구성 변경). */}
          <Stack.Screen
            name="Qr"
            component={QrScreen}
            options={{ headerShown: true, header: () => <Header variant="sub" title="QR" /> }}
          />
          {/* 오늘 주보는 하단 탭에서 빠지고 홈 바로가기로 들어온다 (시안의 탭 구성 변경). */}
          <Stack.Screen
            name="Bulletin"
            component={BulletinScreen}
            options={{
              headerShown: true,
              header: () => <Header variant="sub" title="마태복음 시리즈" rightAction="none" />,
            }}
          />
          <Stack.Screen
            name="DepartmentActivity"
            component={DepartmentActivityScreen}
            options={{
              headerShown: true,
              header: () => <Header variant="sub" title="부서활동 게시판" />,
            }}
          />
          <Stack.Screen
            name="DepartmentActivityDetail"
            component={DepartmentActivityDetailScreen}
            options={{
              headerShown: true,
              header: () => <Header variant="sub" title="부서활동 게시판" />,
            }}
          />
          <Stack.Screen
            name="DepartmentActivityWrite"
            component={DepartmentActivityWriteScreen}
            options={{
              headerShown: true,
              header: () => <Header variant="sub" title="부서활동 글쓰기" />,
            }}
          />
          <Stack.Screen
            name="GroupMeeting"
            component={GroupMeetingScreen}
            options={{
              headerShown: true,
              header: () => <Header variant="sub" title="취향소그룹 게시판" rightAction="home" />,
            }}
          />
          {/* 기도 목록 3개 화면은 PrayerMenu가 헤더를 단독 등록한다 (⋮ 메뉴 포함) — 여기 header를 두면 이중 정의. */}
          <Stack.Screen
            name="PrayerBoard"
            component={PrayerBoardScreen}
            options={{ headerShown: true }}
          />
          <Stack.Screen
            name="PrayerBookmarks"
            component={PrayerBookmarkScreen}
            options={{ headerShown: true }}
          />
          <Stack.Screen
            name="PrayerMine"
            component={MyPrayerScreen}
            options={{ headerShown: true }}
          />
          <Stack.Screen
            name="PrayerBoardDetail"
            component={PrayerDetailScreen}
            options={{
              headerShown: true,
              header: () => <Header variant="sub" title="기도제목" rightAction="bookmark" />,
            }}
          />
          <Stack.Screen
            name="PrayerWrite"
            component={PrayerWriteScreen}
            options={{
              headerShown: true,
              header: () => <Header variant="sub" title="기도제목 작성하기" rightAction="none" />,
            }}
          />

          <Stack.Screen
            name="GroupMeetingDetail"
            component={GroupMeetingDetailScreen}
            options={{ headerShown: true, header: () => <Header variant="overlay" /> }}
          />
          {/* 헤더 타이틀이 팀 이름이라 목업에서 찾아 쓴다. 팀 API가 생기면 화면에서
              navigation.setOptions로 넘기는 쪽이 맞다. */}
          <Stack.Screen
            name="TeamStoryDetail"
            component={TeamStoryDetailScreen}
            options={({ route }) => ({
              headerShown: true,
              header: () => (
                <Header
                  variant="sub"
                  title={findTeam(route.params.teamId)?.name ?? "팀"}
                  rightAction="home"
                />
              ),
            })}
          />
          <Stack.Screen
            name="TeamStoryGallery"
            component={TeamStoryGalleryScreen}
            options={({ route }) => ({
              headerShown: true,
              header: () => (
                <Header
                  variant="sub"
                  title={`${findTeam(route.params.teamId)?.name ?? "팀"} 갤러리`}
                  rightAction="none"
                />
              ),
            })}
          />
          {/* 헤더를 화면이 직접 그린다 (어두운 배경 + 타이틀). Header 컴포넌트는 이 조합이 없다. */}
          <Stack.Screen name="TeamStoryPhotoViewer" component={TeamStoryPhotoViewerScreen} />
          <Stack.Screen
            name="TeamAdmin"
            component={TeamAdminScreen}
            options={{
              headerShown: true,
              header: () => <Header variant="sub" title="팀 관리" rightAction="none" />,
            }}
          />
          <Stack.Screen
            name="TeamForm"
            component={TeamFormScreen}
            options={({ route }) => ({
              headerShown: true,
              header: () => (
                <Header
                  variant="sub"
                  title={route.params?.teamId ? "팀 편집" : "팀 생성"}
                  rightAction="none"
                />
              ),
            })}
          />
          <Stack.Screen
            name="TeamMemberList"
            component={TeamMemberListScreen}
            options={{
              headerShown: true,
              header: () => <Header variant="sub" title="팀원" rightAction="none" />,
            }}
          />
          {/* 헤더 타이틀이 셀 이름이라 목업에서 찾아 쓴다 (TeamStoryDetail과 같은 패턴).
              셀 API가 생기면 화면에서 navigation.setOptions로 넘기는 쪽이 맞다. */}
          <Stack.Screen
            name="CellDetail"
            component={CellDetailScreen}
            options={({ route }) => ({
              headerShown: true,
              header: () => (
                <Header
                  variant="sub"
                  title={findCell(route.params.cellId)?.name ?? "셀 페이지"}
                  rightAction="home"
                />
              ),
            })}
          />
          {/* 헤더는 화면이 단독 등록한다 (⋮ 노출·항목이 권한에 의존) — 여기 header를 두면 이중 정의. */}
          <Stack.Screen
            name="CellNewsDetail"
            component={CellNewsDetailScreen}
            options={{ headerShown: true }}
          />
          <Stack.Screen
            name="CellNewsWrite"
            component={CellNewsWriteScreen}
            options={{
              headerShown: true,
              header: () => <Header variant="sub" title="소식 글쓰기" rightAction="none" />,
            }}
          />
          {/* 검정 배경 뷰어라 공통 헤더를 안 쓰고 화면이 직접 그린다. */}
          <Stack.Screen name="CellGalleryPhoto" component={CellGalleryPhotoScreen} />
          <Stack.Screen
            name="CellAttendance"
            component={CellAttendanceScreen}
            options={{
              headerShown: true,
              header: () => <Header variant="sub" title="출석 관리" rightAction="home" />,
            }}
          />
          <Stack.Screen
            name="FollowerNoteBoard"
            component={FollowerNoteBoardScreen}
            options={{
              headerShown: true,
              header: () => <Header variant="sub" title="팔로워 노트" rightAction="home" />,
            }}
          />
          <Stack.Screen
            name="FollowerNoteWrite"
            component={FollowerNoteWriteScreen}
            options={{
              headerShown: true,
              header: () => <Header variant="sub" title="팔로워 노트 작성" rightAction="none" />,
            }}
          />
          {/* 헤더는 화면이 단독 등록한다 (⋮ 항목이 내 글 여부에 의존) — 여기 header를 두면 이중 정의. */}
          <Stack.Screen
            name="FollowerNoteDetail"
            component={FollowerNoteDetailScreen}
            options={{ headerShown: true }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              headerShown: true,
              header: () => <Header variant="sub" title="설정" rightAction="home" />,
            }}
          />
          <Stack.Screen
            name="ProfileEdit"
            component={ProfileSetupScreen}
            options={{
              headerShown: true,
              header: () => <Header variant="sub" title="회원 정보 수정" rightAction="none" />,
            }}
          />
        </Stack.Navigator>
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen
            name="ProfileSetup"
            component={ProfileSetupScreen}
            options={{
              headerShown: true,
              header: () => <Header variant="sub" title="프로필 설정" rightAction="none" />,
            }}
          />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}
