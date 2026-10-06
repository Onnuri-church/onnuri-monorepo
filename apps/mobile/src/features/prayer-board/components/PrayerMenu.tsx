import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useLayoutEffect } from "react";
import { Alert } from "react-native";

import { type ContextMenuItem } from "../../../shared/components/base/ContextMenu";
import { Header } from "../../../shared/components/base/Header";
import { useAuthStore } from "../../../shared/store/useAuthStore";
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
    // 두 화면 다 내 데이터라 게스트는 401 빈 화면만 만난다 — 이동 전에 안내한다
    // (기도제목 북마크와 같은 패턴).
    const goIfSignedIn = (screen: "PrayerMine" | "PrayerBookmarks") => {
      const { session } = useAuthStore.getState();
      if (session.status !== "authenticated") {
        Alert.alert("로그인이 필요해요", "내 기도제목은 로그인 후 볼 수 있어요.");
        return;
      }
      navigation.navigate(screen);
    };
    const defaultItems: ContextMenuItem[] = [
      {
        icon: "user",
        label: "내 기도제목 보기",
        onPress: () => goIfSignedIn("PrayerMine"),
      },
      {
        icon: "bookmark",
        label: "저장한 기도제목",
        onPress: () => goIfSignedIn("PrayerBookmarks"),
      },
    ];

    navigation.setOptions({
      header: () => <Header variant="sub" title={title} menuItems={items ?? defaultItems} />,
    });
  }, [navigation, title, items]);

  return null;
}
