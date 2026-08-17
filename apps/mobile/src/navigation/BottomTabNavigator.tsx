import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Pressable, Text } from "react-native";

import { BulletinScreen } from "../features/bulletin/BulletinScreen";
import { HomeScreen } from "../features/home/HomeScreen";
import { MyPageScreen } from "../features/my-page/MyPageScreen";
import { SermonScreen } from "../features/sermon/SermonScreen";
import { TeamStoryScreen } from "../features/team-story/TeamStoryScreen";
import { Header } from "../shared/components/base/Header";
import type { RootTabParamList } from "../shared/types/navigation";

const Tab = createBottomTabNavigator<RootTabParamList>();

// 가운데 "말씀" 탭만 탭바 위로 튀어나온 원형 버튼으로 렌더링한다 (Figma 시안 기준).
function SermonTabButton({ onPress, accessibilityState }: BottomTabBarButtonProps) {
  const focused = accessibilityState?.selected;

  return (
    <Pressable
      onPress={onPress}
      className="-top-6 h-16 w-16 items-center justify-center rounded-full bg-primary-normal"
      style={{ opacity: focused ? 0.85 : 1 }}
    >
      <Text className="font-pretendard-semibold text-background-normal text-body-small">
        말씀
      </Text>
    </Pressable>
  );
}

export function BottomTabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ header: () => <Header variant="main" /> }}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "홈" }} />
      {/* 팀스토리만 sub 헤더를 쓴다 — 탭 화면이지만 시안이 타이틀과 홈 버튼을 요구한다.
          하위 화면(상세·갤러리 등)도 같은 헤더라 들어갔다 나올 때 헤더가 바뀌지 않는다. */}
      <Tab.Screen
        name="TeamStory"
        component={TeamStoryScreen}
        options={{
          title: "팀 스토리",
          // 홈 버튼 동작을 직접 넘긴다 — 탭 안에서는 Header의 기본 동작(Main으로 이동)이
          // 이미 Main에 있는 상태라 아무 일도 하지 않는다.
          header: ({ navigation }) => (
            <Header
              variant="sub"
              title="팀스토리"
              rightAction="home"
              onPressHome={() => navigation.navigate("Home")}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Sermon"
        component={SermonScreen}
        options={{ title: "말씀", tabBarButton: (props) => <SermonTabButton {...props} /> }}
      />
      <Tab.Screen name="Bulletin" component={BulletinScreen} options={{ title: "오늘 주보" }} />
      <Tab.Screen name="MyPage" component={MyPageScreen} options={{ title: "마이페이지" }} />
    </Tab.Navigator>
  );
}
