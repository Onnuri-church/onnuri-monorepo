import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Image, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "../../shared/components/base/Icon";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";

// 홈 포스터 배너 크게 보기 — 갤러리 사진 뷰어(CellGalleryPhoto)와 같은 검정 배경 화면.
// 배경이 어두워 공통 sub 헤더를 못 쓰고 화면이 직접 그린다 — 등록부는 headerShown: false.
export function BannerViewerScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "BannerViewer">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { imageUrl, title } = route.params;

  return (
    <View
      className="flex-1 bg-background-dark"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="h-8 flex-row items-center justify-center">
        <Pressable
          className="absolute left-5 h-8 w-8 items-center justify-center"
          onPress={() => navigation.goBack()}
        >
          <Icon name="back" size={28} color={colors.icon.disable} />
        </Pressable>
        <Text className="text-heading-small text-text-disable">{title}</Text>
      </View>

      {/* 포스터는 비율이 제각각이라 화면을 채우고 contain으로 원본 비율을 지킨다. */}
      <Image source={{ uri: imageUrl }} style={{ flex: 1 }} resizeMode="contain" />
    </View>
  );
}
