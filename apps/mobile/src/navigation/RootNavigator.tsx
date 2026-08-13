import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { LoginScreen } from "../features/auth/LoginScreen";
import { DepartmentActivityScreen } from "../features/department-activity/DepartmentActivityScreen";
import { LiveScreen } from "../features/live/LiveScreen";
import { QtBoardScreen } from "../features/qt-board/QtBoardScreen";
import { SplashScreen } from "../features/splash/SplashScreen";
import { Header } from "../shared/components/base/Header";
import { useAppBootstrap } from "../shared/hooks/useAppBootstrap";
import { useAuthStore } from "../shared/store/useAuthStore";
import type { AuthStackParamList, RootStackParamList } from "../shared/types/navigation";
import { BottomTabNavigator } from "./BottomTabNavigator";

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

// 모든 화면이 로그인을 요구하므로, 세션 상태로 트리 전체를 분기한다.
// 세션이 없어지면(로그아웃, 401로 인한 clearSession) 자동으로 로그인 화면으로 전환된다.
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
      {session.status === "authenticated" ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={BottomTabNavigator} />
          <Stack.Screen
            name="QtBoard"
            component={QtBoardScreen}
            options={{ headerShown: true, header: () => <Header variant="sub" title="큐티나눔" /> }}
          />
          <Stack.Screen
            name="Live"
            component={LiveScreen}
            options={{ headerShown: true, header: () => <Header variant="sub" title="실시간 예배" /> }}
          />
          <Stack.Screen
            name="DepartmentActivity"
            component={DepartmentActivityScreen}
            options={{
              headerShown: true,
              header: () => <Header variant="sub" title="부서활동 게시판" />,
            }}
          />
        </Stack.Navigator>
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}
