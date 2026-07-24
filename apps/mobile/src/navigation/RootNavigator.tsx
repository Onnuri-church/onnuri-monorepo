import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "../features/auth/LoginScreen";
import LiveScreen from "../features/live/LiveScreen";
import QtBoardScreen from "../features/qt-board/QtBoardScreen";
import { Header } from "../shared/components/Header";
import { useAuthStore } from "../shared/store/useAuthStore";
import type { AuthStackParamList, RootStackParamList } from "../shared/types/navigation";
import BottomTabNavigator from "./BottomTabNavigator";

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

// 모든 화면이 로그인을 요구하므로, 세션 유무로 트리 전체를 분기한다.
// 세션이 없어지면(로그아웃, 401로 인한 clearSession) 자동으로 로그인 화면으로 전환된다.
export default function RootNavigator() {
  const isAuthenticated = useAuthStore((state) => state.accessToken !== null);

  return (
    <NavigationContainer>
      {isAuthenticated ? (
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
        </Stack.Navigator>
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}
