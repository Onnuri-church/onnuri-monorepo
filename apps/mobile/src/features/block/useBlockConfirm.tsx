import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";

import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { useAuthStore } from "../../shared/store/useAuthStore";
import { useBlockUser } from "./api";

interface BlockTarget {
  userId: string;
  name: string;
}

// "차단하기"를 누르면 확인 팝업을 띄우고, 확인하면 차단한다 (SCRUM-198).
// 화면은 requestBlock을 버튼에 걸고 dialog를 화면 아래에 한 번 그린다.
export function useBlockConfirm(onBlocked?: () => void) {
  const { t } = useTranslation();
  const dialogRef = useRef<AppDialogRef>(null);
  const [target, setTarget] = useState<BlockTarget | null>(null);
  const { mutate: block } = useBlockUser();
  // 게스트는 차단할 계정이 없다 — 버튼 자체를 숨긴다.
  const canBlock = useAuthStore((state) => state.session.status === "authenticated");

  const requestBlock = (next: BlockTarget) => {
    setTarget(next);
    dialogRef.current?.open();
  };

  const dialog = (
    <AppDialog
      ref={dialogRef}
      title={t("{{name}}님을 차단할까요?", { name: target?.name ?? "" })}
      description={t(
        "이 사람의 글·댓글·채팅이 나에게 보이지 않아요. 상대에게는 알리지 않고, 설정 > 차단 목록에서 언제든 풀 수 있어요.",
      )}
      confirmLabel={t("차단하기")}
      cancelLabel={t("취소")}
      onConfirm={() => {
        if (!target) return;
        block(target.userId, {
          onSuccess: () => onBlocked?.(),
          onError: () => Alert.alert(t("차단하지 못했어요"), t("잠시 후 다시 시도해 주세요.")),
        });
      }}
    />
  );

  return { requestBlock, dialog, canBlock };
}
