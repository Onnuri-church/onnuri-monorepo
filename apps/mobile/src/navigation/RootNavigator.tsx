import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { LoginScreen } from "../features/auth/LoginScreen";
import { BulletinDetailScreen } from "../features/bulletin/BulletinDetailScreen";
import { BulletinScreen } from "../features/bulletin/BulletinScreen";
import { SharingSheetScreen } from "../features/bulletin/SharingSheetScreen";
import { DepartmentActivityDetailScreen } from "../features/department-activity/DepartmentActivityDetailScreen";
import { DepartmentActivityScreen } from "../features/department-activity/DepartmentActivityScreen";
import { GroupMeetingDetailScreen } from "../features/group-meeting/GroupMeetingDetailScreen";
import { GroupMeetingScreen } from "../features/group-meeting/GroupMeetingScreen";
import { LiveScreen } from "../features/live/LiveScreen";
import { ProfileSetupScreen } from "../features/profile/ProfileSetupScreen";
import { QrScreen } from "../features/qr/QrScreen";
import { QtBoardDetailScreen } from "../features/qt-board/QtBoardDetailScreen";
import { QtBoardScreen } from "../features/qt-board/QtBoardScreen";
import { SplashScreen } from "../features/splash/SplashScreen";
import { Header } from "../shared/components/base/Header";
import { useAppBootstrap } from "../shared/hooks/useAppBootstrap";
import { useAuthStore } from "../shared/store/useAuthStore";
import type { AuthStackParamList, RootStackParamList } from "../shared/types/navigation";
import { BottomTabNavigator } from "./BottomTabNavigator";

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
            options={{ headerShown: true, header: () => <Header variant="sub" title="큐티나눔" /> }}
          />
          <Stack.Screen
            name="QtBoardDetail"
            component={QtBoardDetailScreen}
            options={{ headerShown: true, header: () => <Header variant="sub" title="큐티나눔" /> }}
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
            name="Live"
            component={LiveScreen}
            options={{ headerShown: true, header: () => <Header variant="sub" title="실시간 예배" /> }}
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
            options={{ headerShown: true, header: () => <Header variant="sub" title="오늘 주보" /> }}
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
            name="GroupMeeting"
            component={GroupMeetingScreen}
            options={{
              headerShown: true,
              header: () => <Header variant="sub" title="취향소그룹 게시판" rightAction="home" />,
            }}
          />
          <Stack.Screen
            name="GroupMeetingDetail"
            component={GroupMeetingDetailScreen}
            options={{ headerShown: true, header: () => <Header variant="overlay" /> }}
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
