import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMemo } from "react";

import { fetchBookmarkedPrayers } from "./api";
import { PrayerFilterList } from "./components/PrayerFilterList";
import { PrayerMenu } from "./components/PrayerMenu";
import type { RootStackParamList } from "../../shared/types/navigation";

// 게시판(PrayerBoardScreen)에서 ⋮ > "저장한 기도제목"으로 들어온다.
export function PrayerBookmarkScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // 기본 메뉴를 그대로 쓰면 지금 보고 있는 이 화면으로 가는 항목이 섞인다 —
  // 내 기도제목(MyPrayerScreen)처럼 자기 화면 항목은 빼고 넘긴다. useMemo 고정도 같은 이유.
  const menuItems = useMemo(
    () => [
      {
        icon: "user" as const,
        label: "내 기도제목 보기",
        onPress: () => navigation.navigate("PrayerMine"),
      },
    ],
    [navigation],
  );

  return (
    <>
      <PrayerFilterList
        name="bookmarked"
        fetchList={fetchBookmarkedPrayers}
        showBookmark
        emptyText="저장한 기도제목이 없어요"
      />
      <PrayerMenu title="저장한 기도제목" items={menuItems} />
    </>
  );
}
