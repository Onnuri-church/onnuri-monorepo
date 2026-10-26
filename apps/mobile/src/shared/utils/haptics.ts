import * as Haptics from "expo-haptics";

import { useHapticsStore } from "../store/useHapticsStore";

// 진동 도우미 — 설정에서 껐거나 진동을 못 쓰는 기기(시뮬레이터·웹)면 조용히 넘어간다.
// 쓰는 기준: 가벼운 반응(탭 전환·토글·버튼)은 light, 성공(출석 완료 등)은 success,
// 오류는 error. 채팅 수신처럼 자주 생기는 일에는 쓰지 않는다 (피로해진다).
function run(effect: () => Promise<void>) {
  if (!useHapticsStore.getState().enabled) return;
  effect().catch(() => {});
}

export function hapticLight() {
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function hapticSuccess() {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function hapticError() {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}
