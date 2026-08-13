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
  /** 우측 버튼. "home"이면 메인 탭으로 돌아간다. 기본값은 더보기(⋮). */
  rightAction?: "more" | "home";
  onPressMore?: () => void;
}

type HeaderProps = MainHeaderProps | SubHeaderProps;

export function Header(props: HeaderProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

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
            <Pressable onPress={() => navigation.navigate("Main" as never)} hitSlop={8}>
              <Icon name="home" size={28} color={colors.icon.strong} />
            </Pressable>
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
