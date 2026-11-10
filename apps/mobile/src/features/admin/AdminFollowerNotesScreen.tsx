import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, isIconName } from "../../shared/components/base/Icon";
import { PressableScale } from "../../shared/components/base/PressableScale";
import { useThemeColors } from "../../shared/theme/useThemeColors";
import type { RootStackParamList } from "../../shared/types/navigation";
import { CellListRow } from "../cell/components/CellListRow";
import { useAdminFollowerNoteOverview } from "./api";

type TabKey = "cell" | "team";

// 팔로워 노트 관리 (SCRUM-181) — 마이페이지 관리자 메뉴 → [셀 팔로워 노트 | 팀 팔로워 노트] 탭 → 목록 → 그 게시판.
// 목록 모양은 셀 페이지·팀 스토리와 같고, 새로 올라온 노트가 있으면 "새 노트 N" 뱃지를 단다
// (이 관리자가 그 게시판을 마지막으로 연 뒤 다른 사람이 쓴 노트 수 — 서버가 계산한다).
// 새 노트가 있는 셀·팀이 위로 오고, 나머지는 최근 노트 순이다.
export function AdminFollowerNotesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tab, setTab] = useState<TabKey>("cell");
  const { data, isLoading, refetch, isRefetching } = useAdminFollowerNoteOverview();

  // 게시판을 보고 돌아오면 새 노트 수가 줄어 있으니 다시 받는다.
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const byRecent = <T extends { newCount: number; lastNoteAt: string | null }>(a: T, b: T) =>
    Number(b.newCount > 0) - Number(a.newCount > 0) ||
    (b.lastNoteAt ?? "").localeCompare(a.lastNoteAt ?? "");
  const cells = [...(data?.cells ?? [])].sort(byRecent);
  const teams = [...(data?.teams ?? [])].sort(byRecent);
  const newCellCount = cells.reduce((sum, cell) => sum + cell.newCount, 0);
  const newTeamCount = teams.reduce((sum, team) => sum + team.newCount, 0);

  const badge = (newCount: number) =>
    newCount > 0 ? t("새 노트 {{count}}", { count: newCount }) : undefined;
  const subtitle = (totalCount: number) =>
    totalCount > 0 ? t("노트 {{count}}개", { count: totalCount }) : t("아직 노트가 없어요");

  const tabs: { key: TabKey; label: string; hasNew: boolean }[] = [
    { key: "cell", label: t("셀 팔로워 노트"), hasNew: newCellCount > 0 },
    { key: "team", label: t("팀 팔로워 노트"), hasNew: newTeamCount > 0 },
  ];

  const empty = (
    <Text className="pt-10 text-center text-body-medium text-text-alternative">
      {isLoading ? t("목록을 불러오고 있어요.") : t("표시할 항목이 없어요.")}
    </Text>
  );
  const refreshControl = (
    <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
  );

  return (
    <View className="flex-1 bg-background-normal">
      {/* 셀 페이지 상단 탭과 같은 모양 — 새 노트가 있는 탭엔 빨간 점 */}
      <View
        className="h-12 flex-row items-center gap-9 px-6"
        style={{
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: themeColors.text.alternative,
        }}
      >
        {tabs.map((item) => {
          const active = item.key === tab;
          return (
            <PressableScale
              key={item.key}
              scaleTo={0.94}
              className="h-full flex-row items-center gap-1"
              style={active ? { borderBottomWidth: 2, borderBottomColor: themeColors.text.normal } : undefined}
              onPress={() => setTab(item.key)}
            >
              <Text className={active ? "text-body-main text-text-normal" : "text-body-main text-text-alternative"}>
                {item.label}
              </Text>
              {item.hasNew && <View className="h-1.5 w-1.5 rounded-full bg-semantic-danger" />}
            </PressableScale>
          );
        })}
      </View>

      {tab === "cell" ? (
        <FlatList
          data={cells}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-5"
          contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
          refreshControl={refreshControl}
          renderItem={({ item }) => (
            <CellListRow
              cell={item}
              isMyCell={false}
              badgeLabel={badge(item.newCount)}
              onPress={() => navigation.navigate("FollowerNoteBoard", { cellId: item.id })}
            />
          )}
          ListEmptyComponent={empty}
        />
      ) : (
        <FlatList
          data={teams}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-5"
          contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
          refreshControl={refreshControl}
          renderItem={({ item }) => (
            <TeamNoteRow
              name={item.name}
              subtitle={subtitle(item.totalCount)}
              icon={isIconName(item.iconName) ? item.iconName : undefined}
              badgeLabel={badge(item.newCount)}
              onPress={() => navigation.navigate("TeamFollowerNoteBoard", { teamId: item.id })}
            />
          )}
          ListEmptyComponent={empty}
        />
      )}
    </View>
  );
}

type IconName = React.ComponentProps<typeof Icon>["name"];

interface TeamNoteRowProps {
  name: string;
  subtitle: string;
  icon?: IconName;
  badgeLabel?: string;
  onPress: () => void;
}

// 팀 탭의 한 줄 — 같은 화면의 셀 탭(CellListRow: 높이 60, 원 40, 이름+보조 한 줄)과 크기를 맞췄다.
// 팀 스토리 목록(TeamListItem, 높이 81)은 그대로 두고 이 화면에서만 쓴다.
function TeamNoteRow({ name, subtitle, icon, badgeLabel, onPress }: TeamNoteRowProps) {
  const themeColors = useThemeColors();
  return (
    <PressableScale
      scaleTo={0.98}
      className="flex-row items-center border-b border-background-assistive py-2.5"
      onPress={onPress}
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-text-assistive">
        {icon && <Icon name={icon} size={20} color={themeColors.icon.strong} />}
      </View>
      <View className="ml-2.5 flex-1 flex-row items-center gap-1">
        <Text className="text-body-main text-text-normal">{name}</Text>
        <Text className="text-body-small text-text-alternative" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {badgeLabel && (
        <View className="rounded-2xl bg-background-alternative px-2.5 py-1">
          <Text className="text-caption-main text-primary-normal">{badgeLabel}</Text>
        </View>
      )}
      <Icon name="expand-right" size={28} />
    </PressableScale>
  );
}
