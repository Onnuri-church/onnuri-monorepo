import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { Modal, Pressable, Platform, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { registerPushToken } from "../../shared/api/push";
import { Button } from "../../shared/components/base/Button";
import { Icon } from "../../shared/components/base/Icon";
import { i18n } from "../../shared/i18n";
import { useThemeColors } from "../../shared/theme/useThemeColors";
import type { RootStackParamList } from "../../shared/types/navigation";

// 앱이 켜져 있을 때(포그라운드)도 배너·소리를 보여준다 — 기본값이 "숨김"이라 명시한다.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Expo Go는 SDK 53부터 원격 푸시를 지원하지 않는다 — 개발 빌드(EAS)에서만 등록을 시도한다.
// 웹은 푸시 대상이 아니다.
function isPushSupported(): boolean {
  return Platform.OS !== "web" && Constants.executionEnvironment !== "storeClient";
}

// 한 번 띄웠으면 이번 실행에서는 다시 묻지 않는다 (홈이 다시 마운트돼도).
let promptedThisRun = false;
// "알림 보지 않기"를 누르면 이 기기에서는 다시 묻지 않는다 (SCRUM-184) — 나중에 켜고 싶으면
// 설정 > 알림 설정에서. 테마 저장과 같은 이유로 SecureStore를 쓴다.
const PROMPT_DISMISSED_KEY = "push-prompt-dismissed";
// 푸시 탭 네비게이션은 응답당 한 번만 — 화면 리마운트로 훅이 같은 응답을 다시 줘도 무시한다.
let handledResponseDate: number | null = null;

// 홈에 마운트되는 푸시 등록 게이트. 권한이 이미 있으면 조용히 토큰을 등록하고, 아직 안 물어봤으면
// 가운데 안내 팝업(SCRUM-184: 종 아이콘 + 알림 받기 버튼 + 작은 "알림 보지 않기")을 먼저 띄운 뒤
// "알림 받기"를 눌렀을 때만 OS 권한 창을 연다.
export function PushNotificationGate() {
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [promptVisible, setPromptVisible] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    void (async () => {
      try {
        // 안드로이드는 채널이 있어야 배너가 뜬다 — 서버 발송의 기본 채널과 이름을 맞춘다.
        // 채널 설정이 실패해도 권한 안내는 이어간다 (여기서 끊기면 팝업이 영영 안 뜬다).
        if (Platform.OS === "android") {
          try {
            await Notifications.setNotificationChannelAsync("default", {
              name: i18n.t("알림"),
              importance: Notifications.AndroidImportance.HIGH,
            });
          } catch (error) {
            Sentry.captureException(error);
          }
        }

        const permission = await Notifications.getPermissionsAsync();
        if (permission.granted) {
          await registerTokenSafely();
          return;
        }
        // 아직 안 물었거나(undetermined) 한 번 거절·닫았어도 다시 물을 수 있으면(denied +
        // canAskAgain) 안내한다 — undetermined만 보면 OS 창을 한 번 닫은 기기는 영영 못 켠다.
        if (permission.canAskAgain && !promptedThisRun) {
          const dismissed = await SecureStore.getItemAsync(PROMPT_DISMISSED_KEY).catch(() => null);
          if (dismissed === "1") return;
          promptedThisRun = true;
          setPromptVisible(true);
        }
      } catch (error) {
        Sentry.captureException(error);
      }
    })();
  }, []);

  // 잠금화면·배너의 푸시를 탭해 앱이 열리면 알림센터로 보낸다 (콜드 스타트 포함).
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
      return;
    }
    const responseDate = response.notification.date;
    if (handledResponseDate === responseDate) return;
    handledResponseDate = responseDate;
    navigation.navigate("Notifications");
  }, [response, navigation]);

  const handleAllowPress = () => {
    setPromptVisible(false);
    void (async () => {
      const permission = await Notifications.requestPermissionsAsync();
      if (permission.granted) await registerTokenSafely();
    })();
  };

  const handleNeverPress = () => {
    setPromptVisible(false);
    SecureStore.setItemAsync(PROMPT_DISMISSED_KEY, "1").catch(() => {});
  };

  return (
    <Modal visible={promptVisible} transparent animationType="fade" onRequestClose={() => setPromptVisible(false)}>
      <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}>
        <View style={{ maxWidth: 340 }} className="w-full items-center gap-3 rounded-2xl bg-background-normal px-6 pb-5 pt-8">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-background-alternative">
            <Icon name="bell" size={32} color={themeColors.primary.normal} />
          </View>
          <Text className="mt-1 text-center text-heading-medium text-text-normal">
            {t("청년부 소식을 놓치지 마세요!")}
          </Text>
          <Text className="text-center text-body-regular text-text-alternative">
            {t("공지사항, 설교 영상, 라이브 예배, 댓글 소식을 알림으로 받아볼 수 있어요.")}
          </Text>
          <Text className="text-center text-body-small text-text-alternative">
            {t("(설정 > 알림 설정에서 바꿀 수 있어요)")}
          </Text>
          <View className="mt-3 w-full">
            <Button label={t("알림 받기")} onPress={handleAllowPress} />
          </View>
          <Pressable className="py-2" onPress={handleNeverPress} hitSlop={8}>
            <Text className="text-body-small text-text-alternative underline">{t("알림 보지 않기")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// 토큰 발급·등록 — 시뮬레이터처럼 푸시가 안 되는 환경에서는 발급이 throw하므로
// 실패해도 앱 동작에는 영향을 주지 않는다.
async function registerTokenSafely(): Promise<void> {
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await registerPushToken(token);
  } catch (error) {
    // 토큰 미등록 = 이 기기로 푸시가 안 올 뿐, 알림센터는 그대로 동작한다. 원인은 Sentry로 남긴다.
    Sentry.captureException(error);
  }
}
