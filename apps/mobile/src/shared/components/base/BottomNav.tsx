import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { colors } from "../../theme/tokens";
import type { RootTabParamList } from "../../types/navigation";
import { Icon } from "./Icon";

// 탭 하나가 쓰는 아이콘. 라벨은 여기 적지 않고 BottomTabNavigator의 options.title에서 읽는다 —
// 같은 문자열을 두 군데 두면 한쪽만 바뀐다. 말씀은 라벨 없이 원형 버튼으로 그려서 목록에 없다.
// size가 제각각인 건 시안 값 그대로다 (원본 viewBox가 24/28로 섞여 있어 맞춰 보이는 크기가 다르다).
const TAB_ICON = {
  Home: { name: "nav-home", size: 24 },
  TeamStory: { name: "announcement", size: 24 },
  Cell: { name: "chat", size: 28 },
  MyPage: { name: "user", size: 24 },
} as const satisfies Partial<Record<keyof RootTabParamList, { name: string; size: number }>>;

// 가운데 말씀 버튼이 탭바 위로 튀어나온 높이. 시안: 지름 68 원의 중심이 탭바 중심보다 38 위 →
// 80/2 - 68/2 - 38 = -32.
const CENTER_OVERHANG = 32;

// 가운데 버튼 둘레로 탭바 흰 배경이 뚫려 있는 반지름. 시안: 지름 68 버튼 둘레 7이 비어서 뒤
// 콘텐츠가 그대로 비친다 → 68/2 + 7 = 41. 버튼 중심(지름 68의 절반)에서 튀어나온 높이를 빼면
// 탭바 기준 구멍 중심 y가 나온다.
const CENTER_HOLE_RADIUS = 41;
const CENTER_HOLE_Y = 34 - CENTER_OVERHANG;
// 구멍과 탭바 윗변이 만나는 자리를 이어주는 반지름. 시안이 각지지 않고 부드럽게 빠진다.
const CENTER_HOLE_SMOOTHING = 10;

// 탭바 배경 경로. 윗변 가운데가 원으로 파이고, 파인 자리는 좌우로 둥글게 이어진다 — 이어주는
// 원은 윗변에 접하면서(중심이 윗변에서 s 아래) 구멍 원에 외접한다(중심 거리 r + s). 두 원의
// 접점은 중심을 잇는 선분을 r : s로 나눈 자리라, 세 호를 접점에서 이으면 각이 지지 않는다.
function backgroundPath(width: number, height: number) {
  const cx = width / 2;
  const r = CENTER_HOLE_RADIUS;
  const s = CENTER_HOLE_SMOOTHING;
  const dx = Math.sqrt((r + s) ** 2 - (s - CENTER_HOLE_Y) ** 2);
  const tx = (dx * r) / (r + s);
  const ty = CENTER_HOLE_Y + ((s - CENTER_HOLE_Y) * r) / (r + s);

  return [
    `M0 0H${cx - dx}`,
    `A${s} ${s} 0 0 1 ${cx - tx} ${ty}`,
    `A${r} ${r} 0 0 0 ${cx + tx} ${ty}`,
    `A${s} ${s} 0 0 1 ${cx + dx} 0`,
    `H${width}V${height}H0Z`,
  ].join(" ");
}

export function BottomNav({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

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

  const centerRoute = state.routes.find((route) => route.name === "Sermon");

  return (
    // 튀어나온 말씀 버튼을 탭바의 자식으로 두면 안드로이드에서 부모 경계 밖으로 나간 부분이
    // 눌리지 않는다. 그래서 컨테이너를 튀어나온 높이만큼 키워 버튼을 그 안에 담고,
    // 흰 배경은 아래쪽 탭바에만 칠한다. 위쪽 빈 영역은 box-none으로 터치를 통과시킨다.
    //
    // 커진 만큼 음수 marginTop으로 되돌린다. React Navigation은 커스텀 tabBar를 화면 콘텐츠
    // 아래에 쌓으므로, 이게 없으면 투명한 위쪽 32까지 탭바 자리로 잡혀 콘텐츠가 보이는 탭바보다
    // 32 위에서 끝난다 (배경색 있는 화면이 오면 탭바 위에 띠가 생긴다). 되돌리면 콘텐츠가
    // 스트립 뒤까지 이어져서 box-none도 의도대로 동작한다. 말씀 버튼은 absolute라 영향이 없다.
    <View
      pointerEvents="box-none"
      style={{ paddingTop: CENTER_OVERHANG, marginTop: -CENTER_OVERHANG }}
    >
      <View
        className="shadow-nav"
        // 시안의 배경이 탭바(80)보다 12 더 내려와 있는 건 홈 인디케이터 영역이다 — 고정값 대신 inset으로 받는다.
        style={{ paddingBottom: insets.bottom }}
      >
        {/* 흰 배경은 배경색이 아니라 SVG로 깐다 — 가운데 버튼 둘레가 시안에서 뚫려 있어(뒤 콘텐츠가
            비친다) 배경색 View로는 만들 수 없다. */}
        <Svg
          pointerEvents="none"
          width={width}
          height={80 + insets.bottom}
          style={StyleSheet.absoluteFill}
        >
          <Path d={backgroundPath(width, 80 + insets.bottom)} fill={colors.background.normal} />
        </Svg>
        <View className="h-20 flex-row">
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;

            // 말씀은 자리만 비워둔다. 실제 버튼은 탭바 밖으로 나가야 해서 아래에 따로 그린다.
            if (route.name === "Sermon") {
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

      {centerRoute ? (
        <View pointerEvents="box-none" className="absolute left-0 right-0 top-0 items-center">
          <Pressable
            onPress={() =>
              handleTabPress(centerRoute, state.index === state.routes.indexOf(centerRoute))
            }
            accessibilityRole="button"
            accessibilityLabel={descriptors[centerRoute.key].options.title}
            className="h-17 w-17 items-center justify-center rounded-full bg-primary-normal"
          >
            <Icon name="book-open-alt-light" size={36} color={colors.icon.disable} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
