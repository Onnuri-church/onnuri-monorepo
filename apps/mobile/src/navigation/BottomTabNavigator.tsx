import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CellScreen } from "../features/cell/CellScreen";
import { HomeScreen } from "../features/home/HomeScreen";
import { MyPageScreen } from "../features/my-page/MyPageScreen";
import { SermonScreen } from "../features/sermon/SermonScreen";
import { TeamStoryScreen } from "../features/team-story/TeamStoryScreen";
import { BottomNav, TAB_BAR_HEIGHT } from "../shared/components/base/BottomNav";
import { Header } from "../shared/components/base/Header";
import type { RootTabParamList } from "../shared/types/navigation";

const Tab = createBottomTabNavigator<RootTabParamList>();

// 기본 탭바 대신 BottomNav를 쓴다 — 가운데 말씀 버튼이 탭바 위로 튀어나오고 배경/그림자도
// 시안 값이라 기본 탭바 옵션으로는 맞출 수 없다. 라벨은 BottomNav가 여기 title에서 읽는다.
export function BottomTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{
        header: () => <Header variant="main" />,
        // 탭바가 오버레이(absolute)라 레이아웃 자리를 차지하지 않는다 — 화면 콘텐츠가
        // 탭바 뒤로 들어가지 않게 탭바 높이만큼 하단 패딩을 공통으로 넣는다.
        // (스크롤 숨김 동작이 화면 크기를 안 바꾸게 하기 위한 구조 — BottomNav 주석 참고)
        sceneStyle: { paddingBottom: TAB_BAR_HEIGHT + insets.bottom },
      }}
    >
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
      {/* 가운데 원형 버튼. 시안에 라벨이 없어서 title은 화면에 안 보이고 접근성 레이블로만 쓰인다. */}
      <Tab.Screen name="Sermon" component={SermonScreen} options={{ title: "말씀" }} />
      {/* 전체 셀 목록도 main 헤더 대신 화면이 직접 그리는 가운데 타이틀을 쓴다 (시안).
          스크롤 숨김을 쓰는 화면이라 공통 하단 패딩을 끄고(sceneStyle 0) 화면이 스크롤
          콘텐츠 패딩으로 직접 확보한다 — 탭바가 숨으면 그 자리까지 콘텐츠가 차오르게. */}
      <Tab.Screen
        name="Cell"
        component={CellScreen}
        options={{ title: "셀 페이지", headerShown: false, sceneStyle: { paddingBottom: 0 } }}
      />
      {/* 마이페이지는 main 헤더 없이 화면 안의 알림·설정 액션 바만 쓴다 (시안).
          하단 패딩은 Cell과 같은 이유로 화면이 직접 확보한다. */}
      <Tab.Screen
        name="MyPage"
        component={MyPageScreen}
        options={{ title: "MY", headerShown: false, sceneStyle: { paddingBottom: 0 } }}
      />
    </Tab.Navigator>
  );
}
