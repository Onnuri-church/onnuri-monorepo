import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useLayoutEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TAB_BAR_HEIGHT } from "../../shared/components/base/BottomNav";
import { Header } from "../../shared/components/base/Header";
import { SearchBar } from "../../shared/components/base/SearchBar";
import { useHideTabBarOnScroll } from "../../shared/hooks/useHideTabBarOnScroll";
import type { RootStackParamList } from "../../shared/types/navigation";
import { CellManageList } from "../admin/components/CellManageList";
import { useMe } from "../profile/useMe";
import { useCells } from "./api";
import { CellListRow } from "./components/CellListRow";

// 하단 탭 "셀 페이지"의 진입 화면 — 전체 셀 목록. 여기서 셀을 고르면 그 셀의 페이지
// (소식/갤러리/구성원/관리 4탭)로 들어가는 구조다. 하단 탭바는 이 목록에서만 보이고,
// 개별 셀 페이지부터는 루트 스택 push라 탭바가 없다.
// 관리자는 이 탭이 바로 셀 관리(생성·편집·삭제 목록)로 뜬다 (2026-09-11 지환님 확정) —
// 마이페이지 관리자 메뉴의 셀 관리와 같은 목록(CellManageList)을 탭 껍데기만 바꿔 그린다.
export function CellScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const handleHideTabBarScroll = useHideTabBarOnScroll();
  const [query, setQuery] = useState("");
  // 셀이 적어 목록이 화면보다 짧아도 살짝 스크롤돼 탭바가 숨겨지게 최소 높이를 잡는다.
  const [listHeight, setListHeight] = useState(0);

  const { data: cells, isLoading, refetch, isRefetching } = useCells();
  // "나의 셀" 뱃지 기준은 /users/me의 현재 소속 — 게스트는 me가 없어 뱃지가 안 붙는다.
  const me = useMe();

  // 관리자는 헤더 ⋮ > 편집하기로 행마다 수정·삭제 아이콘을 켠다.
  const isAdmin = me?.isAdmin === true;
  const [editing, setEditing] = useState(false);
  useLayoutEffect(() => {
    if (!isAdmin) {
      navigation.setOptions({ headerShown: false });
      return;
    }
    navigation.setOptions({
      headerShown: true,
      header: () =>
        editing ? (
          <Header
            variant="sub"
            title={t("셀 관리")}
            rightAction="text"
            rightLabel={t("완료")}
            onPressRightLabel={() => setEditing(false)}
          />
        ) : (
          <Header
            variant="sub"
            title={t("셀 관리")}
            rightAction="more"
            menuItems={[{ icon: "edit", label: t("편집하기"), onPress: () => setEditing(true) }]}
          />
        ),
    });
  }, [navigation, isAdmin, editing, t]);

  const visibleCells = query.trim()
    ? (cells ?? []).filter((cell) => cell.name.includes(query.trim()))
    : (cells ?? []);

  if (isAdmin) {
    return (
      <View className="flex-1 bg-background-normal">
        {/* 헤더는 위 useLayoutEffect가 등록한다 — 생성은 목록 끝의 점선 "셀 생성" 행 (2026-09-21 시안) */}
        <CellManageList
          editing={editing}
          bottomInset={TAB_BAR_HEIGHT + insets.bottom}
          onScroll={handleHideTabBarScroll}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-normal" style={{ paddingTop: insets.top }}>
      {/* 시안 헤더는 뒤로가기 없는 가운데 타이틀 하나라, main/sub 헤더 대신 직접 그린다
          (마이페이지가 액션 바를 직접 그리는 것과 같은 방식). 타이틀 스타일은 시안 근사(heading-small). */}
      <View className="h-14 items-center justify-center">
        <Text className="text-heading-small text-text-normal">{t("전체 셀")}</Text>
      </View>

      <View className="px-5">
        <SearchBar value={query} onChangeText={setQuery} placeholder={t("셀 이름으로 검색")} />
      </View>

      <FlatList
        data={visibleCells}
        keyExtractor={(cell) => cell.id}
        contentContainerClassName="px-5 pt-3"
        // 탭바가 오버레이라 스크롤 콘텐츠가 그 뒤로 지나간다 — 목록 끝이 탭바에
        // 가리지 않게 탭바 높이 + 홈 인디케이터만큼 바닥 여백을 준다 (기존 pb-10 포함).
        contentContainerStyle={{
          paddingBottom: 40 + TAB_BAR_HEIGHT + insets.bottom,
          minHeight: listHeight > 0 ? listHeight + 80 : undefined,
        }}
        onLayout={(event) => setListHeight(event.nativeEvent.layout.height)}
        onScroll={handleHideTabBarScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
        renderItem={({ item }) => (
          <CellListRow
            cell={item}
            isMyCell={item.id === me?.cell?.id}
            onPress={() => navigation.navigate("CellDetail", { cellId: item.id })}
          />
        )}
        ListEmptyComponent={
          <Text className="pt-10 text-center text-body-medium text-text-alternative">
            {isLoading ? t("셀 목록을 불러오고 있어요.") : t("검색 결과가 없어요.")}
          </Text>
        }
      />
    </View>
  );
}
