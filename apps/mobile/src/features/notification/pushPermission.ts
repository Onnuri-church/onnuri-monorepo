import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Linking, Platform } from "react-native";

import { registerPushToken } from "../../shared/api/push";

// 이 기기의 푸시 권한·토큰 등록을 한곳에서 다룬다 — 홈의 첫 안내(PushNotificationGate)와
// 설정 > 알림 설정의 "알림 켜기"(SCRUM-267)가 같이 쓴다.

/**
 * "알림 보지 않기"를 누르면 이 기기에서는 홈 안내를 다시 띄우지 않는다 (SCRUM-184).
 * 테마 저장과 같은 이유로 SecureStore를 쓴다. 알림 설정에서 다시 켜면 지운다.
 */
export const PUSH_PROMPT_DISMISSED_KEY = "push-prompt-dismissed";

/**
 * - unsupported: 푸시가 안 되는 환경 (Expo Go·웹)
 * - granted: 권한 있음 — 토큰만 등록돼 있으면 푸시가 온다
 * - askable: 아직 안 물었거나 다시 물을 수 있음 — OS 권한 창을 띄울 수 있다
 * - blocked: 거절해서 앱이 다시 물을 수 없음 — 휴대폰 설정에서만 켤 수 있다
 */
export type PushStatus = "unsupported" | "granted" | "askable" | "blocked";

// Expo Go는 SDK 53부터 원격 푸시를 지원하지 않는다 — 개발 빌드(EAS)에서만 등록을 시도한다.
// 웹은 푸시 대상이 아니다.
export function isPushSupported(): boolean {
  return Platform.OS !== "web" && Constants.executionEnvironment !== "storeClient";
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!isPushSupported()) return "unsupported";
  const permission = await Notifications.getPermissionsAsync();
  if (permission.granted) return "granted";
  return permission.canAskAgain ? "askable" : "blocked";
}

// 토큰 발급·등록 — 시뮬레이터처럼 푸시가 안 되는 환경에서는 발급이 throw하므로
// 실패해도 앱 동작에는 영향을 주지 않는다. 등록됐는지를 돌려준다.
export async function registerTokenSafely(): Promise<boolean> {
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await registerPushToken(token);
    return true;
  } catch (error) {
    // 토큰 미등록 = 이 기기로 푸시가 안 올 뿐, 알림센터는 그대로 동작한다. 원인은 Sentry로 남긴다.
    Sentry.captureException(error);
    return false;
  }
}

/**
 * 이 기기의 알림을 켠다. 물을 수 있으면 OS 권한 창을 띄우고, 이미 거절한 기기면 휴대폰 설정을 연다
 * (그 경우 돌아왔을 때 getPushStatus로 다시 확인한다). 켜지면 토큰을 등록하고 "다시 묻지 않기" 기록을 지운다.
 */
export async function enablePush(): Promise<PushStatus> {
  const status = await getPushStatus();
  if (status === "unsupported") return status;
  if (status === "blocked") {
    await Linking.openSettings();
    return status;
  }
  if (status === "askable") {
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) return permission.canAskAgain ? "askable" : "blocked";
  }
  await SecureStore.deleteItemAsync(PUSH_PROMPT_DISMISSED_KEY).catch(() => {});
  await registerTokenSafely();
  return "granted";
}
