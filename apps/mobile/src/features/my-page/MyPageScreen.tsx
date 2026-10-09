import type { MeResponse } from "@onnuri/shared";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "../../shared/components/base/Avatar";
import { TAB_BAR_HEIGHT } from "../../shared/components/base/BottomNav";
import { NotificationBell } from "../../shared/components/base/Header";
import { Icon } from "../../shared/components/base/Icon";
import { useHideTabBarOnScroll } from "../../shared/hooks/useHideTabBarOnScroll";
import { i18n } from "../../shared/i18n";
import { signOut } from "../../shared/api/session";
import { useAuthStore } from "../../shared/store/useAuthStore";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { fetchMe } from "../profile/api";
import { useMyStats } from "./api";
import { MenuLinkCard, type MenuLink } from "./components/MenuLinkCard";
import { ProfileInfoCard } from "./components/ProfileInfoCard";
import { RoleBadge } from "./components/RoleBadge";
import { StatsCard } from "./components/StatsCard";
import type { UserRole } from "./types";


// 등급 = isAdmin + 멤버십 역할 (docs/erd.md — 부셀장은 셀장과 동일 권한이라 같은 등급으로 본다).
// 겸직(예: 셀장+팀장)은 시안이 등급당 한 variant만 정의해 관리자 > 셀장 > 팀장 순으로
// 하나만 보여준다 — types.ts 주석 참고, 겸직 표현이 필요해지면 재검토.
// isAdmin은 me와 별도로 받는다 — 세션 유저(로그인 응답)에도 있어서 /users/me 도착 전에
// 관리자 배지를 먼저 띄울 수 있다 (셀장/팀장은 소속 정보가 필요해 조회 후에만 안다).
function deriveRole(me: MeResponse | undefined, isAdmin: boolean): UserRole {
  if (isAdmin) return "admin";
  if (!me) return "member";
  if (me.cell && me.cell.role !== "MEMBER") return "cellLeader";
  if (me.team?.role === "LEADER") return "teamLeader";
  return "member";
}

// 등급별 관리 메뉴 (시안 확정). 일반 유저는 관리 카드가 없다.
interface RoleLinkHandlers {
  onBoardManagePress?: () => void;
  onTeamMemberPress?: () => void;
  onCellManagePress?: () => void;
  onFollowerNotePress?: () => void;
  onAttendancePress?: () => void;
  onMemberListPress?: () => void;
  onAttendanceSheetPress?: () => void;
  onQtManagePress?: () => void;
  onPrayerManagePress?: () => void;
  onBannerManagePress?: () => void;
}

function getRoleLinks(role: UserRole, team: string, handlers: RoleLinkHandlers): MenuLink[] {
  switch (role) {
    case "teamLeader":
      return [
        { label: i18n.t("{{team}} 게시판 관리", { team }), onPress: handlers.onBoardManagePress },
        { label: i18n.t("{{team}} 팀원 관리", { team }), onPress: handlers.onTeamMemberPress },
      ];
    case "cellLeader":
      // 셀 페이지 > 내 셀 > 관리 탭과 같은 화면으로 가는 지름길 — 내 셀 id로 연결한다.
      return [
        { label: i18n.t("팔로워 노트"), onPress: handlers.onFollowerNotePress },
        { label: i18n.t("출석 관리"), onPress: handlers.onAttendancePress },
      ];
    case "admin":
      // 2026-09-09 관리자 시안 기준 4개 — 첫 항목은 "팔로워 노트"였다가 셀 관리로 변경
      // (2026-09-10 지환님: 셀 전체 목록에서 생성·편집·삭제). 기도제목 관리는 별도 화면이
      // 아니라 같은 게시판이다 — 관리자에겐 실명 표시·삭제 줄이 붙는다 (2026-09-23 확정).
      return [
        { label: i18n.t("셀 관리"), onPress: handlers.onCellManagePress },
        { label: i18n.t("회원 관리"), onPress: handlers.onMemberListPress },
        { label: i18n.t("출석부"), onPress: handlers.onAttendanceSheetPress },
        { label: i18n.t("큐티나눔 관리"), onPress: handlers.onQtManagePress },
        { label: i18n.t("기도제목 관리"), onPress: handlers.onPrayerManagePress },
        { label: i18n.t("홈 배너 관리"), onPress: handlers.onBannerManagePress },
      ];
    case "member":
      return [];
  }
}

export function MyPageScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const session = useAuthStore((state) => state.session);
  const handleHideTabBarScroll = useHideTabBarOnScroll();

  // 게스트는 /users/me가 401이라 조회하지 않는다 — 게스트용 로그인 유도 UI는 별도 작업.
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    enabled: session.status === "authenticated",
  });

  // 통계 3종 — 도착 전에는 0으로 그린다 (카드 자리를 비우면 레이아웃이 튄다).
  const { data: myStats } = useMyStats(session.status === "authenticated");
  const stats = [
    {
      label: t("큐티나눔"),
      value: myStats?.qtShareCount ?? 0,
      // 내가 쓴 글 모아보기 — 큐티나눔 게시판을 "내 글" 상태로 연다 (게스트는 통계가 없어 안 눌림).
      onPress: me ? () => navigation.navigate("QtBoard", { mine: true }) : undefined,
    },
    { label: t("출석주수"), value: myStats?.attendanceWeeks ?? 0 },
    { label: t("받은하트"), value: myStats?.receivedHearts ?? 0 },
  ];

  // 아바타 탭 → 확대 보기 (2026-10-07 확정: 마이페이지는 보기 전용, 사진 변경은
  // 설정 > 회원 정보 수정의 아바타 편집기에서만).
  const handleAvatarPress = () => {
    if (!me) return;
    navigation.navigate("AvatarViewer", { imageUrl: me.avatarUrl });
  };

  // /users/me가 오기 전까지는 세션의 유저(로그인 응답)로 이름을 먼저 그린다.
  const sessionUser = session.status === "authenticated" ? session.user : null;
  const name = me?.name ?? sessionUser?.name ?? t("게스트");
  const cell = me?.cell?.name ?? t("없음");
  const team = me?.team?.name ?? t("없음");
  const role = deriveRole(me, me?.isAdmin ?? sessionUser?.isAdmin ?? false);
  const myTeamId = me?.team?.id;
  const roleLinks = getRoleLinks(role, team, {
    // 팀장 메뉴 — 내 팀이 있어야 갈 곳이 정해진다 (teamLeader 판정 자체가 me.team 기준이라 항상 있다).
    onBoardManagePress: myTeamId
      ? () => navigation.navigate("TeamBoardManage", { teamId: myTeamId })
      : undefined,
    onTeamMemberPress: myTeamId
      ? () => navigation.navigate("TeamMemberAdmin", { teamId: myTeamId })
      : undefined,
    onCellManagePress: () => navigation.navigate("AdminCellManage"),
    // 셀장 메뉴 — 내 셀이 있어야 갈 곳이 정해진다 (cellLeader 판정 자체가 me.cell 기준이라 항상 있다).
    onFollowerNotePress: me?.cell
      ? () => navigation.navigate("FollowerNoteBoard", { cellId: me.cell!.id })
      : undefined,
    onAttendancePress: me?.cell
      ? () => navigation.navigate("CellAttendance", { cellId: me.cell!.id })
      : undefined,
    onMemberListPress: () => navigation.navigate("AdminMemberList"),
    onAttendanceSheetPress: () => navigation.navigate("AdminAttendance"),
    // 큐티나눔 관리도 같은 게시판이다 — 관리자는 글쓰기·모든 글 수정·삭제가 된다.
    onQtManagePress: () => navigation.navigate("QtBoard"),
    onPrayerManagePress: () => navigation.navigate("PrayerBoard"),
    onBannerManagePress: () => navigation.navigate("AdminBannerManage"),
  });

  const handleLogoutPress = () => {
    // 토큰·푸시·계정별 캐시까지 정리한다 (설정 로그아웃과 동일).
    void signOut();
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
          <Pressable onPress={() => navigation.navigate("Notifications")}>
            <NotificationBell />
          </Pressable>
          <Pressable onPress={() => navigation.navigate("Settings")}>
            <Icon name="setting" size={28} color={colors.icon.strong} />
          </Pressable>
        </View>

        {/* 프로필 영역 */}
        <View className="mt-5 items-center">
          {/* 탭하면 확대 보기 — 변경이 아니라서 연필 뱃지는 두지 않는다. 게스트는 me가 없어 눌리지 않는다. */}
          <Pressable
            onPress={handleAvatarPress}
            disabled={!me}
            style={({ pressed }) => (pressed ? { opacity: 0.8 } : null)}
          >
            {/* 사진 없을 때의 기본 이미지는 Avatar가 그린다 (OY 심볼 — 온보딩·댓글과 통일) */}
            <Avatar imageUrl={me?.avatarUrl} size={100} />
          </Pressable>
          <Text className="mt-2.5 text-center text-title text-text-normal">
            {t("{{name}}님,\n안녕하세요!", { name })}
          </Text>
          {role !== "member" && (
            <View className="mt-2.5">
              <RoleBadge role={role} teamName={team} />
            </View>
          )}
        </View>

        {/* 카드 목록 — 시안 간격: 카드 사이 13px */}
        <View className="mt-9 gap-3.25">
          <StatsCard stats={stats} />
          {roleLinks.length > 0 && <MenuLinkCard links={roleLinks} />}
          <ProfileInfoCard
            rows={[
              { label: t("이름"), value: name },
              { label: t("소속 셀"), value: cell },
              { label: t("소속 팀"), value: team },
            ]}
          />
          <MenuLinkCard
            links={[
              // 내가 신청·참여 중인 모임 모아보기 — 게시판에서 매번 찾지 않게 하는 지름길.
              // 관리자는 소그룹에 참여하지 않으므로 빈 "내 소그룹" 대신 게시판(관리 분기)으로 간다.
              {
                label: t("취향 소그룹"),
                onPress: () =>
                  navigation.navigate(role === "admin" ? "GroupMeeting" : "MyGroupMeetings"),
              },
              { label: t("공지사항"), onPress: () => navigation.navigate("NoticeList") },
            ]}
          />
        </View>

        <Pressable className="mt-5 self-start pl-4.5" onPress={handleLogoutPress}>
          <Text className="text-caption-main text-text-alternative">{t("로그아웃")}</Text>
        </Pressable>
      </ScrollView>

    </View>
  );
}
