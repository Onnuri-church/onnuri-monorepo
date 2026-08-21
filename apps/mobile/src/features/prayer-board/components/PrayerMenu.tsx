import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useLayoutEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ContextMenu, type ContextMenuItem } from "../../../shared/components/base/ContextMenu";
import { Header } from "../../../shared/components/base/Header";
import type { RootStackParamList } from "../../../shared/types/navigation";

// 메뉴는 헤더 ⋮ 아래 우측에 붙는다. 시안에서 메뉴 오른쪽 끝이 화면 끝에서 14다.
const MENU_RIGHT = 14;
const MENU_TOP_FROM_STATUS_BAR = 8;

interface PrayerMenuProps {
  /** 헤더 타이틀. 헤더를 다시 그리므로 화면마다 자기 타이틀을 넘긴다. */
  title: string;
  /**
   * 메뉴 항목. 안 주면 화면 이동 두 개(내 기도제목 / 저장한 기도제목)가 기본이다.
   * 내 기도제목 화면처럼 다른 항목만 필요하면 통째로 넘긴다.
   */
  items?: ContextMenuItem[];
}

// 기도제목 화면들의 헤더 ⋮ 메뉴. 헤더는 RootNavigator가 고정으로 그리므로,
// ⋮에 동작을 붙이려면 화면에서 헤더를 다시 지정한다.
export function PrayerMenu({ title, items }: PrayerMenuProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => <Header variant="sub" title={title} onPressMore={() => setOpen(true)} />,
    });
  }, [navigation, title]);

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

  return (
    <ContextMenu
      visible={open}
      onClose={() => setOpen(false)}
      style={{ top: insets.top + MENU_TOP_FROM_STATUS_BAR, right: MENU_RIGHT }}
      items={items ?? defaultItems}
    />
  );
}
