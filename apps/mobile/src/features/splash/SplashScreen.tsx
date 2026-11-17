import { StatusBar } from "expo-status-bar";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { Logo } from "../../shared/components/base/Logo";
import { useThemeColors } from "../../shared/theme/useThemeColors";

interface SplashScreenProps {
  /** 세션 복원이 오래 걸리는 중 — "연결 중" 안내 (SCRUM-209) */
  slow?: boolean;
  /** 서버에 끝내 닿지 못했다 — 다시 시도 버튼. 로그인은 살아 있으니 로그인 화면으로 보내지 않는다. */
  failed?: boolean;
  onRetry?: () => void;
}

// 네이티브 스플래시(배경색만 그린다)에서 이어지는 화면이라 배경이 화면 전체를 덮어야 한다.
// SafeAreaView로 감싸면 노치·홈 인디케이터 영역에 흰 띠가 생겨서 전환이 눈에 띈다 — 감싸지 않는다.
// pb-17(68px)은 로고를 정중앙에서 34px 위로 올리기 위한 값이다 (tokens.js의 spacing 참고).
// 안내 문구는 초록 채움 위 글자색(text.disable — 다크에선 어두운 색)을 쓰고, 로고 아래에 절대 위치로 띄운다 — 문구가 생겨도 로고가 움직이지 않게.
export function SplashScreen({ slow = false, failed = false, onRetry }: SplashScreenProps) {
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  return (
    <View className="flex-1 items-center justify-center bg-primary-normal pb-17">
      {/* 진초록 배경이라 상태바를 밝게. style="light"는 배경이 아니라 글자·아이콘 색을 뜻한다. */}
      <StatusBar style="light" />
      <Logo />
      {failed ? (
        <View className="absolute bottom-24 items-center px-8">
          <Text className="text-center text-text-disable">{t("서버에 연결하지 못했어요")}</Text>
          <Text className="mt-1 text-center text-text-disable opacity-70">
            {t("인터넷 연결을 확인하고 다시 시도해주세요.")}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            className="mt-5 rounded-full border border-text-disable px-6 py-3 active:opacity-70"
          >
            <Text className="text-text-disable">{t("다시 시도")}</Text>
          </Pressable>
        </View>
      ) : slow ? (
        <View className="absolute bottom-24 items-center px-8">
          <ActivityIndicator color={themeColors.text.disable} />
          <Text className="mt-3 text-center text-text-disable opacity-80">{t("서버에 연결하고 있어요…")}</Text>
        </View>
      ) : null}
    </View>
  );
}
