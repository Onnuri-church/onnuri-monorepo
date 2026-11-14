import type { MeResponse } from "@onnuri/shared";
import type { TFunction } from "i18next";
import { Alert } from "react-native";

import { queryClient } from "../../shared/api/queryClient";

// 새 글쓰기 전에 이용 정지 여부를 미리 안내한다 (SCRUM-204). 서버도 같은 규칙으로 막으므로(403
// USER_SUSPENDED) 여기서는 다 쓰고 나서 실패하지 않게 하는 역할이다. 내 정보를 아직 못 받았으면 통과시킨다.
export function ensureNotSuspended(t: TFunction, onAllowed: () => void): void {
  const suspension = queryClient.getQueryData<MeResponse>(["me"])?.suspension;
  if (!suspension) {
    onAllowed();
    return;
  }
  Alert.alert(
    t("이용이 제한된 계정이에요"),
    t("{{label}} 글·댓글·채팅을 쓸 수 없어요. 궁금한 점은 청년부 임원에게 문의해 주세요.", {
      label: suspension.label,
    }),
  );
}
