import { useNavigation } from "@react-navigation/native";
import { useRef, useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../theme/tokens";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";
import { Icon } from "./Icon";
import { Logo } from "./Logo";

// 헤더 콘텐츠 행 높이 (안전영역 제외).
const HEADER_ROW_HEIGHT = 61;
// ⋮ 메뉴는 버튼을 실측해서 그 바로 아래에 붙인다. 여기 상수는 버튼과의 간격뿐이다.
const MENU_GAP_BELOW_BUTTON = 4;

interface MainHeaderProps {
  variant: "main";
  onPressQr?: () => void;
  onPressNotification?: () => void;
  onPressSettings?: () => void;
}

interface SubHeaderProps {
  variant: "sub";
  title: string;
  /**
   * 우측 버튼. "home"이면 메인 탭으로 돌아간다. "export"면 공유 버튼(주보 상세 등),
   * "bookmark"면 저장 버튼(기도제목 상세).
   * "none"이면 버튼 없이 자리만 비운다 (타이틀이 가운데 유지되도록 아이콘과 같은 폭).
   * 기본값은 더보기(⋮).
   */
  rightAction?: "more" | "home" | "export" | "bookmark" | "none";
  /**
   * ⋮ 드롭다운 항목. ⋮를 누르면 헤더가 내장 ContextMenu를 연다.
   * 항목이 고정이면 RootNavigator 등록부에서 넘기고, 화면 데이터에 의존하면
   * 화면이 setOptions로 헤더를 단독 등록하며 넘긴다 — 그 화면은 등록부에 header를 두지 않는다
   * (헤더 정의는 화면당 정확히 한 곳).
   */
  menuItems?: ContextMenuItem[];
  /** 공유 버튼 동작 (rightAction이 "export"일 때). */
  onPressShare?: () => void;
  /** 북마크 버튼 동작 (rightAction이 "bookmark"일 때). */
  onPressBookmark?: () => void;
  /** 북마크가 켜져 있는지 (rightAction이 "bookmark"일 때 채워진 아이콘으로 그린다). */
  bookmarked?: boolean;
  /**
   * 홈 버튼 동작. 안 주면 메인 탭으로 돌아간다.
   * 탭 안에서 쓰는 화면(팀스토리)은 이미 Main에 있어서 기본 동작이 아무 일도 하지 않으므로,
   * 갈 탭을 아는 쪽에서 직접 넘긴다.
   */
  onPressHome?: () => void;
}

interface OverlayHeaderProps {
  variant: "overlay";
  onPressShare?: () => void;
}

type HeaderProps = MainHeaderProps | SubHeaderProps | OverlayHeaderProps;

export function Header(props: HeaderProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { width: windowWidth } = useWindowDimensions();
  const moreButtonRef = useRef<View>(null);
  // ⋮ 메뉴를 붙일 화면 좌표. null이면 닫힘 — 버튼을 실측한 뒤에 열리므로 위치와 열림 상태가 같이 간다.
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; right: number } | null>(null);

  // 헤더 높이를 상수로 가정하지 않고 ⋮ 버튼의 실제 위치를 재서 그 아래에 붙인다.
  const openMenu = () => {
    moreButtonRef.current?.measureInWindow((x, y, width, height) => {
      setMenuAnchor({
        top: y + height + MENU_GAP_BELOW_BUTTON,
        right: windowWidth - (x + width),
      });
    });
  };

  // 상세 페이지용. 타이틀·배경·구분선이 없고 히어로 이미지 위에 겹쳐 놓는다.
  if (props.variant === "overlay") {
    return (
      <View
        className="absolute left-0 right-0 top-0 z-10 flex-row items-center justify-between px-4"
        style={{ paddingTop: insets.top, height: insets.top + 56 }}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Icon name="back" size={28} color={colors.icon.strong} />
        </Pressable>
        <Pressable onPress={props.onPressShare} hitSlop={8}>
          <Icon name="export" size={28} color={colors.icon.strong} />
        </Pressable>
      </View>
    );
  }

  return (
    <View className="px-4 bg-background-normal" style={{ paddingTop: insets.top }}>
      {/* 안전영역은 바깥 View가 처리한다 — 여기에 insets를 또 더하면 헤더가 상태바만큼 밀린다. */}
      <View className={`${props.variant === "main" ? 'border-b border-background-alternative' : 'pt-4'} flex-row items-center justify-between bg-background-normal`}
            style={{ height: HEADER_ROW_HEIGHT }}
      >
        {props.variant === "main" ? (
            <>
              <Logo variant="horizontal-green" />
              <View className="flex-row items-center gap-4">
                {/* QR은 하단 탭이 아니라 여기서 연다. 갈 곳이 정해져 있어 기본 동작을 준다. */}
                <Pressable
                  onPress={props.onPressQr ?? (() => navigation.navigate("Qr" as never))}
                  hitSlop={8}
                >
                  <Icon name="qr" size={23} color={colors.icon.strong} />
                </Pressable>
                <Pressable onPress={props.onPressNotification} hitSlop={8}>
                  <Icon name="bell" size={28} color={colors.icon.strong} />
                </Pressable>
                <Pressable onPress={props.onPressSettings} hitSlop={8}>
                  <Icon name="setting" size={28} color={colors.icon.strong} />
                </Pressable>
              </View>
            </>
        ) : (
            <>
              <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
                <Icon name="back" size={28} color={colors.icon.strong} />
              </Pressable>
              <Text className="font-pretendard-semibold text-heading-small">{props.title}</Text>
              {props.rightAction === "home" ? (
                  <Pressable
                      onPress={props.onPressHome ?? (() => navigation.navigate("Main" as never))}
                      hitSlop={8}
                  >
                    <Icon name="home" size={28} color={colors.icon.strong} />
                  </Pressable>
              ) : props.rightAction === "export" ? (
                  <Pressable onPress={props.onPressShare} hitSlop={8}>
                    <Icon name="export" size={28} color={colors.icon.strong} />
                  </Pressable>
              ) : props.rightAction === "bookmark" ? (
                  <Pressable onPress={props.onPressBookmark} hitSlop={8}>
                    <Icon
                        name={props.bookmarked ? "bookmark-active" : "bookmark"}
                        size={28}
                        color={props.bookmarked ? colors.primary.normal : colors.icon.strong}
                    />
                  </Pressable>
              ) : props.rightAction === "none" ? (
                  <View className="w-7" />
              ) : (
                  <Pressable ref={moreButtonRef} onPress={openMenu} hitSlop={8}>
                    <Icon name="more" size={28} color={colors.icon.strong} />
                  </Pressable>
              )}
              {props.menuItems && (
                  <ContextMenu
                      visible={menuAnchor !== null}
                      onClose={() => setMenuAnchor(null)}
                      items={props.menuItems}
                      style={menuAnchor ?? undefined}
                  />
              )}
            </>
        )}
      </View>
    </View>
  );
}
