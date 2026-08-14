import { Pressable, Text, View } from "react-native";

import GoogleMark from "../../../shared/assets/logo/google.svg";
import KakaoMark from "../../../shared/assets/logo/kakao.svg";

// 카카오·구글 버튼의 색·마크·문구는 각 사 브랜딩 가이드가 고정한 값이라 semantic 토큰으로 만들지 않는다
// (로고와 같은 브랜드 자산 예외 — DESIGN.md 컬러 규칙 참고). 그래서 토큰 클래스가 아니라 style로 직접 준다.
// 마크 SVG도 다색이고 정사각형이 아니라서(카카오 24×23) Icon을 거치지 않고 여기서만 import한다.
const PROVIDERS = {
  kakao: {
    label: "카카오 로그인",
    Mark: KakaoMark,
    markHeight: 23,
    box: { backgroundColor: "#FEE500" },
    labelColor: "rgba(0, 0, 0, 0.85)",
  },
  google: {
    label: "구글 로그인",
    Mark: GoogleMark,
    markHeight: 24,
    box: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB" },
    labelColor: "rgba(0, 0, 0, 0.8)",
  },
} as const;

interface SocialLoginButtonProps {
  provider: keyof typeof PROVIDERS;
  onPress: () => void;
}

export function SocialLoginButton({ provider, onPress }: SocialLoginButtonProps) {
  const { label, Mark, markHeight, box, labelColor } = PROVIDERS[provider];

  // 눌림 상태는 Pressable의 style 콜백으로만 처리한다(DESIGN.md props 규칙).
  // 시안에 pressed 색이 없어서 우선 투명도로 두고, 확정 규칙이 나오면 이 줄만 바꾼다.
  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? { opacity: 0.85 } : null)}>
      <View className="h-12 flex-row items-center justify-center rounded-5" style={box}>
        {/* 마크는 버튼 왼쪽에 고정하고 문구는 버튼 전체 기준으로 가운데 — 시안과 같은 배치 */}
        <View className="absolute left-6">
          <Mark width={24} height={markHeight} />
        </View>
        <Text className="text-heading-small" style={{ color: labelColor }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
