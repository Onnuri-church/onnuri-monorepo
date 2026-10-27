import { useNavigation, usePreventRemove, type NavigationAction } from "@react-navigation/native";
import { useRef, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard } from "react-native";

import { AppDialog, type AppDialogRef } from "../components/base/AppDialog";

/**
 * 폼 입력값이 "처음 상태"에서 바뀌었는지.
 *
 * 처음 상태는 `ready`가 처음 true가 되는 렌더의 값이다. 새 글은 바로 true로 두면 되고, 수정 모드는
 * 기존 글이 입력칸에 채워진 뒤에 true여야 한다 — 채워지기 전에 잡으면 채워지는 것 자체가 "바뀐 것"이 된다.
 * 기본값(오늘 날짜 등)만 있는 상태는 처음 상태와 같으므로 바뀐 것으로 치지 않는다.
 */
export function useFormDirty(values: unknown, ready = true): boolean {
  const current = JSON.stringify(values);
  const baselineRef = useRef<string | null>(null);
  if (ready && baselineRef.current === null) baselineRef.current = current;
  return baselineRef.current !== null && baselineRef.current !== current;
}

// 화면 종류별 문구 — 글쓰기 / 무언가를 만드는 화면(셀·팀·소그룹·단톡방·리더 방) / 이미 있는 것을 고치는 화면.
const COPY = {
  write: {
    title: "작성을 그만할까요?",
    description: "작성 중인 내용이 사라져요.",
    cancel: "계속 작성",
  },
  create: {
    title: "만들기를 그만할까요?",
    description: "입력한 내용이 사라져요.",
    cancel: "계속 만들기",
  },
  edit: {
    title: "수정을 그만할까요?",
    description: "수정한 내용은 저장되지 않아요.",
    cancel: "계속 수정",
  },
} as const;

interface DiscardGuardOptions {
  /** 입력이 처음 상태에서 바뀌었는지 (useFormDirty) */
  dirty: boolean;
  /**
   * 저장 중이거나 저장에 성공한 상태 (useSubmitLock의 locked 등). 성공하면 화면이 스스로 뒤로 가는데
   * 그때 확인 팝업이 막으면 안 된다 — 저장에 실패해 잠금이 풀리면 다시 켜진다.
   */
  submitting: boolean;
  mode: keyof typeof COPY;
}

/**
 * 작성·수정 화면에서 내용이 바뀐 채 나가려 하면 확인 팝업을 띄운다.
 *
 * 헤더의 뒤로가기, 안드로이드 뒤로가기, 화면 가장자리 밀기는 모두 네비게이션의 화면 제거라
 * usePreventRemove 한 곳에서 같이 잡힌다. "나가기"를 누르면 막았던 이동을 그대로 다시 보내는데,
 * 그 이동에는 "이미 확인한 화면" 표시가 달려 있어서 다시 막히지 않는다.
 *
 * 반환값(팝업)을 화면 JSX 안 아무 데나(보통 맨 끝) 그려 넣는다.
 * 앱을 강제로 끄거나 시스템이 앱을 종료하는 경우는 막을 수 없다.
 */
export function useDiscardGuard({ dirty, submitting, mode }: DiscardGuardOptions): ReactElement {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const dialogRef = useRef<AppDialogRef>(null);
  const blockedActionRef = useRef<NavigationAction | null>(null);

  usePreventRemove(dirty && !submitting, ({ data }) => {
    blockedActionRef.current = data.action;
    // 헤더의 뒤로가기는 키보드를 내리지 않는다 — 열려 있으면 하단 팝업이 키보드 뒤에 가려져서
    // 화면만 어두워지고 팝업은 안 보인다. 먼저 내린다.
    Keyboard.dismiss();
    dialogRef.current?.open();
  });

  const handleLeavePress = () => {
    dialogRef.current?.close();
    const action = blockedActionRef.current;
    blockedActionRef.current = null;
    if (action) navigation.dispatch(action);
  };

  const copy = COPY[mode];
  return (
    <AppDialog
      ref={dialogRef}
      title={t(copy.title)}
      description={t(copy.description)}
      confirmLabel={t("나가기")}
      cancelLabel={t(copy.cancel)}
      onConfirm={handleLeavePress}
    />
  );
}
