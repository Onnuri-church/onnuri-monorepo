import type { TFunction } from "i18next";
import { Alert, Platform } from "react-native";

export type SuspendDays = 7 | 30 | null;

// 이용 정지 기간 고르기 (SCRUM-204) — 신고 관리와 회원 상세가 같이 쓴다.
// 안드로이드 Alert는 버튼이 3개까지라 취소 버튼 대신 바깥을 눌러 닫게 한다.
export function openSuspendPicker(t: TFunction, name: string, onPick: (days: SuspendDays) => void) {
  const options = [
    { text: t("7일"), onPress: () => onPick(7) },
    { text: t("30일"), onPress: () => onPick(30) },
    { text: t("해제할 때까지"), style: "destructive" as const, onPress: () => onPick(null) },
  ];
  Alert.alert(
    t("{{name}}님을 이용 정지할까요?", { name }),
    t("정지 기간 동안 글·댓글·채팅·사진을 올릴 수 없어요. 읽기는 그대로 돼요."),
    Platform.OS === "ios" ? [...options, { text: t("취소"), style: "cancel" as const }] : options,
    { cancelable: true },
  );
}
