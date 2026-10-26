import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDeleteTeam, useTeams } from "./api";
import { TeamListItem } from "./components/TeamListItem";
import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { TAB_BAR_HEIGHT } from "../../shared/components/base/BottomNav";
import { Header } from "../../shared/components/base/Header";
import { Icon, isIconName } from "../../shared/components/base/Icon";
import { Skeleton } from "../../shared/components/base/Skeleton";
import { useHideTabBarOnScroll } from "../../shared/hooks/useHideTabBarOnScroll";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useMe } from "../profile/useMe";

// 관리자에게는 이 탭이 곧 팀 관리다 — 헤더 ⋮ > 편집하기로 행마다 수정·삭제, 목록 끝 점선 행으로 생성
// (셀 탭이 관리자에게 셀 관리로 뜨는 것과 같은 방식). 일반 유저·게스트는 목록만 본다.
export function TeamStoryScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // 하단 탭 화면이라 스크롤 내리면 탭바를 숨긴다 (홈·셀·말씀·마이페이지와 동일 —
  // 이 탭만 연결이 빠져 있었다).
  const handleHideTabBarScroll = useHideTabBarOnScroll();
  const insets = useSafeAreaInsets();
  // 팀이 적어 목록이 화면보다 짧으면 스크롤 자체가 안 돼 탭바가 안 숨겨진다 —
  // 콘텐츠 최소 높이를 화면 높이 + 여유분으로 잡아 항상 살짝 스크롤되게 한다.
  const [viewportHeight, setViewportHeight] = useState(0);
  const { data: teams, refetch, isRefetching, isPending, isError } = useTeams();
  const me = useMe();
  const canManage = me?.isAdmin === true;
  const deleteDialogRef = useRef<AppDialogRef>(null);
  const deleteTeam = useDeleteTeam();
  const [pendingTeamId, setPendingTeamId] = useState<string | null>(null);
  // 관리자만 — 헤더 ⋮ > 편집하기로 켜면 행마다 수정·삭제 아이콘이 나온다.
  const [editing, setEditing] = useState(false);

  useLayoutEffect(() => {
    if (!canManage) return;
    navigation.setOptions({
      header: () =>
        editing ? (
          <Header
            variant="sub"
            title={t("팀스토리")}
            hideBack
            rightAction="text"
            rightLabel={t("완료")}
            onPressRightLabel={() => setEditing(false)}
          />
        ) : (
          <Header
            variant="sub"
            title={t("팀스토리")}
            hideBack
            rightAction="more"
            menuItems={[{ icon: "edit", label: t("편집하기"), onPress: () => setEditing(true) }]}
          />
        ),
    });
  }, [navigation, canManage, editing, t]);

  const handleDeletePress = (teamId: string) => {
    setPendingTeamId(teamId);
    deleteDialogRef.current?.open();
  };

  const handleDeleteConfirm = () => {
    if (pendingTeamId) deleteTeam.mutate(pendingTeamId);
    setPendingTeamId(null);
    deleteDialogRef.current?.close();
  };

  return (
    <View className="flex-1 bg-background-normal">
      <ScrollView
        contentContainerClassName="gap-4 px-5 pt-7"
        // 탭바가 오버레이라 스크롤 콘텐츠가 그 뒤로 지나간다 — 목록 끝이 탭바에
        // 가리지 않게 탭바 높이 + 홈 인디케이터만큼 바닥 여백을 준다 (기존 pb-6 포함).
        contentContainerStyle={{
          paddingBottom: 24 + TAB_BAR_HEIGHT + insets.bottom,
          minHeight: viewportHeight > 0 ? viewportHeight + 80 : undefined,
        }}
        onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
        onScroll={handleHideTabBarScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
      >
        {/* 로딩·실패·빈 목록도 스크롤 안에서 그린다 — 당겨서 새로고침과 관리자의 "팀 생성" 줄이
            그대로 남아야 첫 팀을 만들거나 다시 불러올 수 있다. */}
        {isPending && (
          <>
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </>
        )}
        {isError && !teams && (
          <Text className="mt-10 text-center text-body-medium text-text-alternative">
            {t("팀 목록을 불러오지 못했어요")}
          </Text>
        )}
        {teams?.length === 0 && (
          <Text className="mt-10 text-center text-body-medium text-text-alternative">
            {t("등록된 팀이 없어요")}
          </Text>
        )}
        {(teams ?? []).map((team) => (
          <TeamListItem
            key={team.id}
            name={team.name}
            description={team.tagline ?? ""}
            // iconName에는 아이콘 이름이 들어온다 (시드가 넣는 값) — 등록 안 된 이름이면 안 그린다.
            icon={isIconName(team.iconName) ? team.iconName : undefined}
            onPress={() => navigation.navigate("TeamStoryDetail", { teamId: team.id })}
            // 콜백을 안 넘기면 수정·삭제 아이콘이 안 나온다 — 편집 모드가 아니면 목록 그대로다.
            onEditPress={
              canManage && editing
                ? () => navigation.navigate("TeamForm", { teamId: team.id })
                : undefined
            }
            onDeletePress={canManage && editing ? () => handleDeletePress(team.id) : undefined}
          />
        ))}

        {/* 새 팀 만들기. 파라미터 없이 열면 폼이 생성 모드가 된다. */}
        {canManage && (
          <Pressable
            className="h-12 flex-row items-center justify-center gap-1 rounded-xl border border-dashed border-icon-normal active:opacity-60"
            onPress={() => navigation.navigate("TeamForm")}
          >
            <Icon name="plus" size={20} />
            <Text className="text-body-main text-text-alternative">{t("팀 생성")}</Text>
          </Pressable>
        )}
      </ScrollView>

      <AppDialog
        ref={deleteDialogRef}
        title={t("정말 삭제하시겠습니까?")}
        description={t("삭제된 데이터는 복구할 수 없습니다.")}
        confirmLabel={t("확인")}
        cancelLabel={t("취소")}
        placement="center"
        onConfirm={handleDeleteConfirm}
      />
    </View>
  );
}
