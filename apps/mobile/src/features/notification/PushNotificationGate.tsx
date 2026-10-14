import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useTranslation } from "react-i18next";

import { registerPushToken } from "../../shared/api/push";
import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { i18n } from "../../shared/i18n";
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

// "나중에 하기"를 누르면 이번 실행에서는 다시 묻지 않는다 — 다음 앱 실행 때 다시 묻는다.
// (OS 권한을 거절한 게 아니라 우리 안내만 미룬 것이므로 영구 저장까지는 하지 않는다.)
let promptedThisRun = false;
// 푸시 탭 네비게이션은 응답당 한 번만 — 화면 리마운트로 훅이 같은 응답을 다시 줘도 무시한다.
let handledResponseDate: number | null = null;

// 홈에 마운트되는 푸시 등록 게이트 (화면에는 권한 안내 다이얼로그만 그린다 — 2026-09-30 시안).
// 권한이 이미 있으면 조용히 토큰을 등록하고, 아직 안 물어봤으면 안내를 먼저 띄운 뒤
// "알림 받기"를 눌렀을 때만 OS 권한 창을 연다.
export function PushNotificationGate() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const dialogRef = useRef<AppDialogRef>(null);

  useEffect(() => {
    if (!isPushSupported()) return;
    void (async () => {
      // 안드로이드는 채널이 있어야 배너가 뜬다 — 서버 발송의 기본 채널과 이름을 맞춘다.
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: i18n.t("알림"),
          importance: Notifications.AndroidImportance.HIGH,
        });
      }

      const permission = await Notifications.getPermissionsAsync();
      if (permission.granted) {
        await registerTokenSafely();
        return;
      }
      if (permission.status === "undetermined" && permission.canAskAgain && !promptedThisRun) {
        promptedThisRun = true;
        dialogRef.current?.open();
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
    dialogRef.current?.close();
    void (async () => {
      const permission = await Notifications.requestPermissionsAsync();
      if (permission.granted) await registerTokenSafely();
    })();
  };

  return (
    <AppDialog
      ref={dialogRef}
      title={t("공지를 놓치지 않게 알림을 켜주세요")}
      description={t("중요한 소식을 먼저 알려드려요")}
      confirmLabel={t("알림 받기")}
      cancelLabel={t("나중에 하기")}
      onConfirm={handleAllowPress}
    />
  );
}

// 토큰 발급·등록 — 시뮬레이터처럼 푸시가 안 되는 환경에서는 발급이 throw하므로
// 실패해도 앱 동작에는 영향을 주지 않는다.
async function registerTokenSafely(): Promise<void> {
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await registerPushToken(token);
  } catch {
    // 토큰 미등록 = 이 기기로 푸시가 안 올 뿐, 알림센터는 그대로 동작한다.
  }
}
