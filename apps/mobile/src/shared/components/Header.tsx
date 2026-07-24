import { useNavigation } from "@react-navigation/native";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// 아이콘 라이브러리 미확정이라 텍스트/기호로 임시 대체 (DESIGN.md 오픈 이슈 참고).
interface MainHeaderProps {
  variant: "main";
  onPressNotification?: () => void;
  onPressSettings?: () => void;
}

interface SubHeaderProps {
  variant: "sub";
  title: string;
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
            <Pressable onPress={props.onPressNotification}>
              <Text className="text-body-small">알림</Text>
            </Pressable>
            <Pressable onPress={props.onPressSettings}>
              <Text className="text-body-small">설정</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Text className="text-heading-small">‹</Text>
          </Pressable>
          <Text className="font-pretendard-semibold text-heading-small">{props.title}</Text>
          <Pressable onPress={props.onPressMore} hitSlop={8}>
            <Text className="text-heading-small">⋮</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
