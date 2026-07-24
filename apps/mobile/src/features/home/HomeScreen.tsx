import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";

import type { RootStackParamList } from "../../shared/types/navigation";

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View className="flex-1 items-center justify-center gap-4">
      <Text className="text-title font-pretendard-bold">홈</Text>
      <Pressable onPress={() => navigation.navigate("QtBoard")}>
        <Text className="text-body-main font-pretendard-semibold">큐티나눔 보기</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate("Live")}>
        <Text className="text-body-main font-pretendard-semibold">실시간 예배 보기</Text>
      </Pressable>
    </View>
  );
}
