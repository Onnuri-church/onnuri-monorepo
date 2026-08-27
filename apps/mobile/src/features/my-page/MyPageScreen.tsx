import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TAB_BAR_HEIGHT } from "../../shared/components/base/BottomNav";
import { Icon } from "../../shared/components/base/Icon";
import { useHideTabBarOnScroll } from "../../shared/hooks/useHideTabBarOnScroll";
import { useAuthStore } from "../../shared/store/useAuthStore";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { MenuLinkCard, type MenuLink } from "./components/MenuLinkCard";
import { ProfileInfoCard } from "./components/ProfileInfoCard";
import { RoleBadge } from "./components/RoleBadge";
import { StatsCard } from "./components/StatsCard";
import type { UserRole } from "./types";

// API 연동 전 목업 데이터. role 값을 바꾸면 등급별 variant(배지·관리 메뉴)를 확인할 수 있다.
const MOCK_PROFILE: {
  name: string;
  cell: string;
  team: string;
  role: UserRole;
} = {
  name: "온누리",
  cell: "누리셀",
  team: "SNS팀",
  role: "member",
};

const MOCK_STATS = [
  { label: "큐티나눔", value: 10 },
  { label: "출석주수", value: 30 },
  { label: "받은하트", value: 8 },
];

// 등급별 관리 메뉴 (시안 확정). 일반 유저는 관리 카드가 없다.
// TODO(라우트): 대상 화면들(게시판 관리·팀원 관리·팔로워 노트·출석 관리·기도제목 관리)이
//   아직 없어 onPress를 비워둔다. 화면이 생기면 라우트 등록과 함께 연결.
function getRoleLinks(role: UserRole, team: string): MenuLink[] {
  switch (role) {
    case "teamLeader":
      return [{ label: `${team} 게시판 관리` }, { label: `${team} 팀원 관리` }];
    case "cellLeader":
      return [{ label: "팔로워 노트" }, { label: "출석 관리" }];
    case "admin":
      return [{ label: "팔로워 노트" }, { label: "기도제목 관리" }];
    case "member":
      return [];
  }
}

export function MyPageScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const clearSession = useAuthStore((state) => state.clearSession);
  const handleHideTabBarScroll = useHideTabBarOnScroll();

  const { name, cell, team, role } = MOCK_PROFILE;
  const roleLinks = getRoleLinks(role, team);

  const handleLogoutPress = () => {
    // TODO(로그인 연동): 서버 세션 만료 처리가 생기면 여기서 같이 호출.
    clearSession();
  };

  return (
    <View className="flex-1 bg-background-alternative">
      <ScrollView
        // 탭바가 오버레이라 콘텐츠가 그 뒤로 지나간다 — 로그아웃이 탭바에 가리지 않게
        // 탭바 높이 + 홈 인디케이터만큼 바닥 여백을 준다 (기존 pb-10 포함).
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: 40 + TAB_BAR_HEIGHT + insets.bottom,
        }}
        contentContainerClassName="px-5"
        onScroll={handleHideTabBarScroll}
        scrollEventThrottle={16}
      >
        {/* 상단 액션 바 — 이 화면은 main 헤더(로고+앱 이름) 대신 알림·설정 아이콘만 쓴다 (시안). */}
        <View className="mt-7 flex-row justify-end gap-2">
          {/* TODO(라우트): 알림 화면 미정 — 생기면 연결 */}
          <Pressable>
            <Icon name="bell" size={28} color={colors.icon.strong} />
          </Pressable>
          <Pressable onPress={() => navigation.navigate("Settings")}>
            <Icon name="setting" size={28} color={colors.icon.strong} />
          </Pressable>
        </View>

        {/* 프로필 영역 */}
        <View className="mt-5 items-center">
          {/* TODO(사진): 프로필 사진 연동 전 임시 placeholder — 흰 원 + user 아이콘 */}
          <View className="h-25 w-25 items-center justify-center rounded-full bg-background-normal">
            <Icon name="user" size={48} />
          </View>
          <Text className="mt-2.5 text-center text-title text-text-normal">
            {name}님,{"\n"}안녕하세요!
          </Text>
          {role !== "member" && (
            <View className="mt-2.5">
              <RoleBadge role={role} teamName={team} />
            </View>
          )}
        </View>

        {/* 카드 목록 — 시안 간격: 카드 사이 13px */}
        <View className="mt-9 gap-3.25">
          <StatsCard stats={MOCK_STATS} />
          {roleLinks.length > 0 && <MenuLinkCard links={roleLinks} />}
          <ProfileInfoCard
            rows={[
              { label: "이름", value: name },
              { label: "소속 셀", value: cell },
              { label: "소속 팀", value: team },
            ]}
          />
          {/* TODO(라우트): 공지사항 화면 미구현 — 생기면 연결 */}
          <MenuLinkCard links={[{ label: "공지사항" }]} />
        </View>

        <Pressable className="mt-5 self-start pl-4.5" onPress={handleLogoutPress}>
          <Text className="text-caption-main text-text-alternative">로그아웃</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
