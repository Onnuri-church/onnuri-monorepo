import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { Pressable, useWindowDimensions } from "react-native";

import { Avatar } from "../../shared/components/base/Avatar";
import type { RootStackParamList } from "../../shared/types/navigation";

// 프로필 사진 확대 보기 (마이페이지 아바타 탭 — 2026-10-07 확정: 마이페이지는 보기만,
// 수정은 설정 > 회원 정보 수정에서). 어두운 반투명 배경 위에 큰 원 하나만 띄우고,
// 아무 데나 누르면 닫힌다. transparentModal로 띄워 뒤 화면이 비친다.
export function AvatarViewerScreen() {
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, "AvatarViewer">>();
  const { width } = useWindowDimensions();

  return (
    <Pressable
      className="flex-1 items-center justify-center"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.85)" }}
      onPress={() => navigation.goBack()}
    >
      {/* 배경이 어두워 상태바 글자를 밝게 (사진 뷰어와 같은 처리) */}
      <StatusBar style="light" />
      <Avatar imageUrl={params.imageUrl} size={width - 80} />
    </Pressable>
  );
}
