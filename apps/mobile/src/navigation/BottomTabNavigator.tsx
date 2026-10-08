import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useTranslation } from "react-i18next";

import { CellScreen } from "../features/cell/CellScreen";
import { HomeScreen } from "../features/home/HomeScreen";
import { MyPageScreen } from "../features/my-page/MyPageScreen";
import { SermonScreen } from "../features/sermon/SermonScreen";
import { TeamStoryScreen } from "../features/team-story/TeamStoryScreen";
import { BottomNav } from "../shared/components/base/BottomNav";
import { Header } from "../shared/components/base/Header";
import type { RootTabParamList } from "../shared/types/navigation";

const Tab = createBottomTabNavigator<RootTabParamList>();

// 기본 탭바 대신 BottomNav를 쓴다 — 가운데 말씀 버튼이 탭바 위로 튀어나오고 배경/그림자도
// 시안 값이라 기본 탭바 옵션으로는 맞출 수 없다. 라벨은 BottomNav가 여기 title에서 읽는다.
//
// 탭바가 오버레이(absolute)라 화면 콘텐츠는 탭바 뒤까지 이어진다 — 하단 여백은 sceneStyle
// 공통 패딩이 아니라 각 화면이 스크롤 콘텐츠 패딩(TAB_BAR_HEIGHT + inset)으로 확보한다.
// 그래야 탭바가 스크롤로 숨었을 때 빈 띠 대신 콘텐츠가 보인다.
export function BottomTabNavigator() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{
        header: () => <Header variant="main" />,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t("홈") }} />
      {/* 팀스토리만 sub 헤더를 쓴다 — 탭 화면이지만 시안이 타이틀과 홈 버튼을 요구한다.
          하위 화면(상세·갤러리 등)도 같은 헤더라 들어갔다 나올 때 헤더가 바뀌지 않는다. */}
      <Tab.Screen
        name="TeamStory"
        component={TeamStoryScreen}
        options={{
          title: t("팀 스토리"),
          // 홈 버튼 동작을 직접 넘긴다 — 탭 안에서는 Header의 기본 동작(Main으로 이동)이
          // 이미 Main에 있는 상태라 아무 일도 하지 않는다.
          header: ({ navigation }) => (
            <Header
              variant="sub"
              title={t("팀스토리")}
              rightAction="home"
              onPressHome={() => navigation.navigate("Home")}
            />
          ),
        }}
      />
      {/* 가운데 원형 버튼. 시안에 라벨이 없어서 title은 화면에 안 보이고 접근성 레이블로만 쓰인다. */}
      <Tab.Screen name="Sermon" component={SermonScreen} options={{ title: t("말씀") }} />
      {/* 전체 셀 목록도 main 헤더 대신 화면이 직접 그리는 가운데 타이틀을 쓴다 (시안). */}
      <Tab.Screen name="Cell" component={CellScreen} options={{ title: t("셀 페이지"), headerShown: false }} />
      {/* 마이페이지는 main 헤더 없이 화면 안의 알림·설정 액션 바만 쓴다 (시안). */}
      <Tab.Screen name="MyPage" component={MyPageScreen} options={{ title: t("MY"), headerShown: false }} />
    </Tab.Navigator>
  );
}
