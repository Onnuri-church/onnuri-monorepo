import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TAB_BAR_HEIGHT } from "../../shared/components/base/BottomNav";
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
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const handleHideTabBarScroll = useHideTabBarOnScroll();
  const [query, setQuery] = useState("");

  const { data: cells, isLoading } = useCells();
  // "나의 셀" 뱃지 기준은 /users/me의 현재 소속 — 게스트는 me가 없어 뱃지가 안 붙는다.
  const me = useMe();

  const visibleCells = query.trim()
    ? (cells ?? []).filter((cell) => cell.name.includes(query.trim()))
    : (cells ?? []);

  if (me?.isAdmin) {
    return (
      <View className="flex-1 bg-background-normal" style={{ paddingTop: insets.top }}>
        {/* 탭 화면이라 뒤로가기 없이 가운데 타이틀만 — 생성은 목록 끝의 점선 "셀 생성" 행 (2026-09-21 시안) */}
        <View className="h-14 items-center justify-center">
          <Text className="text-heading-small text-text-normal">셀 관리</Text>
        </View>
        <CellManageList bottomInset={TAB_BAR_HEIGHT + insets.bottom} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-normal" style={{ paddingTop: insets.top }}>
      {/* 시안 헤더는 뒤로가기 없는 가운데 타이틀 하나라, main/sub 헤더 대신 직접 그린다
          (마이페이지가 액션 바를 직접 그리는 것과 같은 방식). 타이틀 스타일은 시안 근사(heading-small). */}
      <View className="h-14 items-center justify-center">
        <Text className="text-heading-small text-text-normal">전체 셀</Text>
      </View>

      <View className="px-5">
        <SearchBar value={query} onChangeText={setQuery} placeholder="셀 이름으로 검색" />
      </View>

      <FlatList
        data={visibleCells}
        keyExtractor={(cell) => cell.id}
        contentContainerClassName="px-5 pt-3"
        // 탭바가 오버레이라 스크롤 콘텐츠가 그 뒤로 지나간다 — 목록 끝이 탭바에
        // 가리지 않게 탭바 높이 + 홈 인디케이터만큼 바닥 여백을 준다 (기존 pb-10 포함).
        contentContainerStyle={{ paddingBottom: 40 + TAB_BAR_HEIGHT + insets.bottom }}
        onScroll={handleHideTabBarScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <CellListRow
            cell={item}
            isMyCell={item.id === me?.cell?.id}
            onPress={() => navigation.navigate("CellDetail", { cellId: item.id })}
          />
        )}
        ListEmptyComponent={
          <Text className="pt-10 text-center text-body-medium text-text-alternative">
            {isLoading ? "셀 목록을 불러오고 있어요." : "검색 결과가 없어요."}
          </Text>
        }
      />
    </View>
  );
}
