import { useNavigation } from "@react-navigation/native";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../theme/tokens";
import { Icon } from "./Icon";

interface MainHeaderProps {
  variant: "main";
  onPressNotification?: () => void;
  onPressSettings?: () => void;
}

interface SubHeaderProps {
  variant: "sub";
  title: string;
  /**
   * 우측 버튼. "home"이면 메인 탭으로 돌아간다. "export"면 공유 버튼(주보 상세 등).
   * "none"이면 버튼 없이 자리만 비운다 (타이틀이 가운데 유지되도록 아이콘과 같은 폭).
   * 기본값은 더보기(⋮).
   */
  rightAction?: "more" | "home" | "export" | "none";
  onPressMore?: () => void;
  /** 공유 버튼 동작 (rightAction이 "export"일 때). */
  onPressShare?: () => void;
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
    <View
      className="flex-row items-center justify-between border-b border-background-alternative bg-background-normal px-4"
      style={{ paddingTop: insets.top, height: insets.top + 56 }}
    >
      {props.variant === "main" ? (
        <>
          <View>
            <Text className="font-pretendard-bold text-heading-small">ONNURI YOUTH</Text>
            <Text className="text-caption-small text-text-alternative">온누리교회 청년부</Text>
          </View>
          <View className="flex-row items-center gap-4">
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
          ) : props.rightAction === "none" ? (
            <View className="w-7" />
          ) : (
            <Pressable onPress={props.onPressMore} hitSlop={8}>
              <Icon name="more" size={28} color={colors.icon.strong} />
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}
