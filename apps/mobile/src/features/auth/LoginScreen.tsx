import { Pressable, Text, View } from "react-native";

import type { User } from "@onnuri/shared";

import { useAuthStore } from "../../shared/store/useAuthStore";

// 실제 로그인 구현 전까지 화면 확인용으로만 쓰는 임시 세션. 로그인 연동 시 통째로 지운다.
const DEV_USER: User = {
  id: "dev-user",
  name: "개발용 계정",
  cellName: null,
  teamId: null,
  role: "member",
  createdAt: "2026-01-01T00:00:00.000Z",
};

export function LoginScreen() {
  const setSession = useAuthStore((state) => state.setSession);

  return (
    <View className="flex-1 items-center justify-center gap-4">
      <Text className="text-title font-pretendard-bold">로그인</Text>
      <Pressable onPress={() => setSession(DEV_USER, "dev")}>
        <Text className="text-body-main font-pretendard-semibold">임시 로그인 (개발용)</Text>
      </Pressable>
    </View>
  );
}
