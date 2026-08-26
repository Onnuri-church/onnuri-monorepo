import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useLayoutEffect } from "react";

import { type ContextMenuItem } from "../../../shared/components/base/ContextMenu";
import { Header } from "../../../shared/components/base/Header";
import type { RootStackParamList } from "../../../shared/types/navigation";

interface PrayerMenuProps {
  /** 헤더 타이틀. 헤더를 다시 그리므로 화면마다 자기 타이틀을 넘긴다. */
  title: string;
  /**
   * 메뉴 항목. 안 주면 화면 이동 두 개(내 기도제목 / 저장한 기도제목)가 기본이다.
   * 내 기도제목 화면처럼 다른 항목만 필요하면 통째로 넘긴다.
   * 넘길 때는 useMemo로 고정한다 — 헤더를 다시 그리는 effect의 의존성이라
   * 매 렌더 새 배열이면 렌더마다 setOptions가 돈다.
   */
  items?: ContextMenuItem[];
}

// 기도제목 화면들의 헤더 ⋮ 메뉴. 헤더는 RootNavigator가 고정으로 그리므로,
// ⋮에 항목을 붙이려면 화면에서 헤더를 다시 지정한다. 드롭다운 자체는 Header가
// menuItems로 품고 있어서 여기서는 항목만 정해서 넘긴다.
export function PrayerMenu({ title, items }: PrayerMenuProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useLayoutEffect(() => {
    const defaultItems: ContextMenuItem[] = [
      {
        icon: "user",
        label: "내 기도제목 보기",
        onPress: () => navigation.navigate("PrayerMine"),
      },
      {
        icon: "bookmark",
        label: "저장한 기도제목",
        onPress: () => navigation.navigate("PrayerBookmarks"),
      },
    ];

    navigation.setOptions({
      header: () => <Header variant="sub" title={title} menuItems={items ?? defaultItems} />,
    });
  }, [navigation, title, items]);

  return null;
}
