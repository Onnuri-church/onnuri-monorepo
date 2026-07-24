import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import BulletinScreen from "../features/bulletin/BulletinScreen";
import LiveScreen from "../features/live/LiveScreen";
import MyPageScreen from "../features/my-page/MyPageScreen";
import QtBoardScreen from "../features/qt-board/QtBoardScreen";
import SermonScreen from "../features/sermon/SermonScreen";
import type { RootTabParamList } from "../shared/types/navigation";

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={SermonScreen} options={{ title: "말씀" }} />
      <Tab.Screen name="Bulletin" component={BulletinScreen} options={{ title: "주보" }} />
      <Tab.Screen name="QtBoard" component={QtBoardScreen} options={{ title: "큐티나눔" }} />
      <Tab.Screen name="Live" component={LiveScreen} options={{ title: "실시간 예배" }} />
      <Tab.Screen name="MyPage" component={MyPageScreen} options={{ title: "마이페이지" }} />
    </Tab.Navigator>
  );
}
