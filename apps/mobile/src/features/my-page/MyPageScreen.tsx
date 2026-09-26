import type { MeResponse } from "@onnuri/shared";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useRef, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppSheet, type AppSheetRef } from "../../shared/components/base/AppSheet";
import { TAB_BAR_HEIGHT } from "../../shared/components/base/BottomNav";
import { Icon } from "../../shared/components/base/Icon";
import { useHideTabBarOnScroll } from "../../shared/hooks/useHideTabBarOnScroll";
import { useAuthStore } from "../../shared/store/useAuthStore";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { uploadImage } from "../../shared/api/upload";
import { fetchMe, patchMyAvatar } from "../profile/api";
import { findTeamByName } from "../team-story/teams";
import { MenuLinkCard, type MenuLink } from "./components/MenuLinkCard";
import { ProfileInfoCard } from "./components/ProfileInfoCard";
import { RoleBadge } from "./components/RoleBadge";
import { StatsCard } from "./components/StatsCard";
import type { UserRole } from "./types";

// TODO(통계 API): 큐티나눔·출석주수·받은하트는 원본(게시글·출석) 데이터가 아직 없어 목업 유지.
const MOCK_STATS = [
  { label: "큐티나눔", value: 10 },
  { label: "출석주수", value: 30 },
  { label: "받은하트", value: 8 },
];

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
// TODO(라우트): 나머지 대상 화면들(게시판 관리·팔로워 노트·출석 관리)이
//   아직 없어 onPress를 비워둔다. 화면이 생기면 라우트 등록과 함께 연결.
interface RoleLinkHandlers {
  onTeamMemberPress?: () => void;
  onCellManagePress?: () => void;
  onMemberListPress?: () => void;
  onAttendanceSheetPress?: () => void;
  onPrayerManagePress?: () => void;
  onBannerManagePress?: () => void;
}

function getRoleLinks(role: UserRole, team: string, handlers: RoleLinkHandlers): MenuLink[] {
  switch (role) {
    case "teamLeader":
      return [
        { label: `${team} 게시판 관리` },
        { label: `${team} 팀원 관리`, onPress: handlers.onTeamMemberPress },
      ];
    case "cellLeader":
      return [{ label: "팔로워 노트" }, { label: "출석 관리" }];
    case "admin":
      // 2026-09-09 관리자 시안 기준 4개 — 첫 항목은 "팔로워 노트"였다가 셀 관리로 변경
      // (2026-09-10 지환님: 셀 전체 목록에서 생성·편집·삭제). 기도제목 관리는 별도 화면이
      // 아니라 같은 게시판이다 — 관리자에겐 실명 표시·삭제 줄이 붙는다 (2026-09-23 확정).
      return [
        { label: "셀 관리", onPress: handlers.onCellManagePress },
        { label: "회원 관리", onPress: handlers.onMemberListPress },
        { label: "출석부", onPress: handlers.onAttendanceSheetPress },
        { label: "기도제목 관리", onPress: handlers.onPrayerManagePress },
        { label: "홈 배너 관리", onPress: handlers.onBannerManagePress },
      ];
    case "member":
      return [];
  }
}

export function MyPageScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const clearSession = useAuthStore((state) => state.clearSession);
  const session = useAuthStore((state) => state.session);
  const handleHideTabBarScroll = useHideTabBarOnScroll();

  // 게스트는 /users/me가 401이라 조회하지 않는다 — 게스트용 로그인 유도 UI는 별도 작업.
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    enabled: session.status === "authenticated",
  });

  // 아바타 탭 → 사진 선택 → 업로드 → 저장. 정사각 크롭은 시스템 피커의 편집 화면에 맡긴다.
  const queryClient = useQueryClient();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarSheetRef = useRef<AppSheetRef>(null);

  // 사진이 이미 있으면 시트에서 고르고(변경/기본 이미지), 없으면 바로 앨범을 연다 —
  // 선택지가 하나뿐일 때 시트를 띄우는 건 손만 늘리는 일이라서다.
  const handleAvatarPress = () => {
    if (!me || avatarUploading) return;
    if (me.avatarUrl) {
      avatarSheetRef.current?.open();
    } else {
      void handleAvatarPickPress();
    }
  };

  const handleAvatarPickPress = async () => {
    avatarSheetRef.current?.close();
    if (!me || avatarUploading) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled) return;
    setAvatarUploading(true);
    try {
      const url = await uploadImage(result.assets[0].uri);
      await patchMyAvatar(url);
      // 다른 화면(셀원 목록·댓글 등)의 아바타는 각자 쿼리라 다음 조회 때 따라온다.
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    } catch {
      Alert.alert("사진 업로드 실패", "잠시 후 다시 시도해주세요.");
    } finally {
      setAvatarUploading(false);
    }
  };

  // 기본 이미지로 변경 — 창고의 옛 파일도 서버가 그 자리에서 지운다.
  const handleAvatarResetPress = async () => {
    avatarSheetRef.current?.close();
    if (!me || avatarUploading) return;
    setAvatarUploading(true);
    try {
      await patchMyAvatar(null);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    } catch {
      Alert.alert("변경 실패", "잠시 후 다시 시도해주세요.");
    } finally {
      setAvatarUploading(false);
    }
  };

  // /users/me가 오기 전까지는 세션의 유저(로그인 응답)로 이름을 먼저 그린다.
  const sessionUser = session.status === "authenticated" ? session.user : null;
  const name = me?.name ?? sessionUser?.name ?? "게스트";
  const cell = me?.cell?.name ?? "없음";
  const team = me?.team?.name ?? "없음";
  const role = deriveRole(me, me?.isAdmin ?? sessionUser?.isAdmin ?? false);
  // 팀 화면들이 아직 목업 데이터라 실제 팀 id 대신 이름으로 목업 id를 찾아 넘긴다
  // (팀 화면이 API로 넘어오면 me.team.id를 그대로 쓴다).
  const myTeamId = findTeamByName(team)?.id;
  const roleLinks = getRoleLinks(role, team, {
    onTeamMemberPress: myTeamId
      ? () => navigation.navigate("TeamMemberAdmin", { teamId: myTeamId })
      : undefined,
    onCellManagePress: () => navigation.navigate("AdminCellManage"),
    onMemberListPress: () => navigation.navigate("AdminMemberList"),
    onAttendanceSheetPress: () => navigation.navigate("AdminAttendance"),
    onPrayerManagePress: () => navigation.navigate("PrayerBoard"),
    onBannerManagePress: () => navigation.navigate("AdminBannerManage"),
  });

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
          {/* 탭하면 사진 변경 — 우하단 연필 뱃지가 그 표시다. 게스트는 me가 없어 눌리지 않는다. */}
          <Pressable
            onPress={handleAvatarPress}
            disabled={!me || avatarUploading}
            style={({ pressed }) => (pressed ? { opacity: 0.8 } : null)}
          >
            {me?.avatarUrl ? (
              <Image source={{ uri: me.avatarUrl }} className="h-25 w-25 rounded-full" />
            ) : (
              <View className="h-25 w-25 items-center justify-center rounded-full bg-background-normal">
                <Icon name="user" size={48} />
              </View>
            )}
            {me && (
              <View className="absolute bottom-0 right-0 h-7 w-7 items-center justify-center rounded-full border border-background-assistive bg-background-normal">
                <Icon name="edit" size={14} color={colors.icon.normal} />
              </View>
            )}
          </Pressable>
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

      {/* 프로필 사진 변경 시트 — 사진이 있을 때만 열린다 (SelectField 시트와 같은 결) */}
      <AppSheet
        ref={avatarSheetRef}
        footer={
          <View className="bg-background-normal px-4 pb-4">
            <View className="border-t-2 border-background-assistive" />
            <Pressable
              onPress={() => avatarSheetRef.current?.close()}
              className="pt-4"
              style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
            >
              <Text className="text-center text-body-medium text-text-alternative">취소</Text>
            </Pressable>
          </View>
        }
      >
        <View className="gap-6 p-4 pb-9">
          <Pressable
            onPress={() => void handleAvatarPickPress()}
            style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
          >
            <Text className="text-center text-body-medium text-text-normal">
              앨범에서 사진 선택
            </Text>
          </Pressable>
          <Pressable
            onPress={() => void handleAvatarResetPress()}
            style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
          >
            <Text className="text-center text-body-medium text-semantic-danger">
              기본 이미지로 변경
            </Text>
          </Pressable>
        </View>
      </AppSheet>
    </View>
  );
}
