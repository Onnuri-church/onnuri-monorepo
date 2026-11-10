import type { TFunction } from "i18next";
import { Alert } from "react-native";

import { useAuthStore } from "../../shared/store/useAuthStore";
import { submitConsent } from "./api";

// 큐티나눔·기도제목 새 글쓰기 전에 민감정보 처리 동의를 확인한다 (SCRUM-175).
// 동의했으면 바로 onGranted, 아니면 안내 팝업에서 그 자리에서 동의할 수 있게 한다.
// 서버도 같은 규칙으로 막으므로(403) 여기서는 작성하다 실패하지 않게 미리 안내하는 역할이다.
export function ensureSensitiveConsent(t: TFunction, onGranted: () => void): void {
  const { session } = useAuthStore.getState();
  if (session.status === "authenticated" && session.user.sensitiveConsented) {
    onGranted();
    return;
  }
  Alert.alert(
    t("민감정보 처리 동의가 필요해요"),
    t("큐티나눔·기도제목에는 신앙에 관한 내용이 담길 수 있어 동의 후에 글을 쓸 수 있어요. 설정에서 언제든 철회할 수 있어요."),
    [
      { text: t("취소"), style: "cancel" },
      {
        text: t("동의하고 작성"),
        onPress: () => {
          submitConsent({ sensitive: true })
            .then(onGranted)
            .catch(() =>
              Alert.alert(t("동의를 저장하지 못했어요"), t("잠시 후 다시 시도해 주세요.")),
            );
        },
      },
    ],
  );
}
