import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../theme/tokens";
import type { RootTabParamList } from "../../types/navigation";
import { Icon } from "./Icon";

// 탭 하나가 쓰는 아이콘. 라벨은 여기 적지 않고 BottomTabNavigator의 options.title에서 읽는다 —
// 같은 문자열을 두 군데 두면 한쪽만 바뀐다. QR은 라벨 없이 원형 버튼으로 그려서 목록에 없다.
// size가 제각각인 건 시안 값 그대로다 (원본 viewBox가 24/28로 섞여 있어 맞춰 보이는 크기가 다르다).
const TAB_ICON = {
  Home: { name: "nav-home", size: 24 },
  TeamStory: { name: "announcement", size: 24 },
  Cell: { name: "chat", size: 28 },
  MyPage: { name: "user", size: 24 },
} as const satisfies Partial<Record<keyof RootTabParamList, { name: string; size: number }>>;

// 가운데 QR 버튼이 탭바 위로 튀어나온 높이. 시안: 지름 68 원의 중심이 탭바 중심보다 38 위 →
// 80/2 - 68/2 - 38 = -32.
const QR_OVERHANG = 32;

export function BottomNav({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const handleTabPress = (route: (typeof state.routes)[number], isFocused: boolean) => {
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  const qrRoute = state.routes.find((route) => route.name === "Qr");

  return (
    // 튀어나온 QR 버튼을 탭바의 자식으로 두면 안드로이드에서 부모 경계 밖으로 나간 부분이
    // 눌리지 않는다. 그래서 컨테이너를 튀어나온 높이만큼 키워 버튼을 그 안에 담고,
    // 흰 배경은 아래쪽 탭바에만 칠한다. 위쪽 빈 영역은 box-none으로 터치를 통과시킨다.
    <View pointerEvents="box-none" style={{ paddingTop: QR_OVERHANG }}>
      <View
        className="bg-background-normal shadow-nav"
        // 시안의 배경이 탭바(80)보다 12 더 내려와 있는 건 홈 인디케이터 영역이다 — 고정값 대신 inset으로 받는다.
        style={{ paddingBottom: insets.bottom }}
      >
        <View className="h-20 flex-row">
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;

            // QR은 자리만 비워둔다. 실제 버튼은 탭바 밖으로 나가야 해서 아래에 따로 그린다.
            if (route.name === "Qr") {
              return <View key={route.key} className="flex-1" />;
            }

            const icon = TAB_ICON[route.name as keyof typeof TAB_ICON];

            return (
              <Pressable
                key={route.key}
                onPress={() => handleTabPress(route, isFocused)}
                accessibilityRole="button"
                accessibilityState={{ selected: isFocused }}
                className="flex-1 items-center justify-center gap-2"
              >
                <Icon
                  name={icon.name}
                  size={icon.size}
                  color={isFocused ? colors.icon.strong : colors.icon.normal}
                />
                <Text
                  className={
                    isFocused
                      ? "text-label-nav text-text-normal"
                      : "text-label-nav text-text-alternative"
                  }
                >
                  {descriptors[route.key].options.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {qrRoute ? (
        <View pointerEvents="box-none" className="absolute left-0 right-0 top-0 items-center">
          <Pressable
            onPress={() => handleTabPress(qrRoute, state.index === state.routes.indexOf(qrRoute))}
            accessibilityRole="button"
            accessibilityLabel={descriptors[qrRoute.key].options.title}
            className="h-17 w-17 items-center justify-center rounded-full bg-primary-normal"
          >
            <Icon name="book-open-alt-light" size={36} color={colors.icon.disable} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
