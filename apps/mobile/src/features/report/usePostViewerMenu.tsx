import { useNavigation } from "@react-navigation/native";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { ContextMenuItem } from "../../shared/components/base/ContextMenu";
import { useBlockConfirm } from "../block/useBlockConfirm";
import { useReport } from "./useReport";

interface ViewedPost {
  id: string;
  /** 익명 글이면 null — 차단 항목을 빼서 차단 목록에 실명이 드러나지 않게 한다 */
  authorId: string | null;
  authorName: string;
  isMine: boolean;
}

// 남의 글 상세의 ⋮ 메뉴 항목 (SCRUM-201) — 신고하기 + 작성자 차단하기.
// 내 글·게스트·아직 못 받은 글이면 빈 배열. 차단하면 그 글이 목록에서 빠지므로 이전 화면으로 돌아간다.
// 화면은 items를 헤더 menuItems에 넣고, sheets(신고 시트·차단 확인)를 화면 안에 한 번 그린다.
export function usePostViewerMenu(post: ViewedPost | undefined) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { openReport, sheet: reportSheet, canReport } = useReport();
  const { requestBlock, dialog: blockDialog } = useBlockConfirm(() => navigation.goBack());

  // 헤더를 다시 그리는 effect의 의존성이라 글이 바뀔 때만 새로 만든다 — 매 렌더 새 배열이면
  // 렌더마다 setOptions가 돈다 (PrayerMenu와 같은 이유). openReport·requestBlock은 안에서 상태 setter만
  // 부르므로 이전 렌더의 함수를 써도 같다.
  const postId = post?.id;
  const authorId = post?.authorId ?? null;
  const authorName = post?.authorName ?? "";
  const isMine = post?.isMine ?? true;
  const items = useMemo<ContextMenuItem[]>(() =>
    postId && !isMine && canReport
      ? [
          {
            icon: "warning",
            label: t("신고하기"),
            onPress: () => openReport({ targetType: "POST", targetId: postId }),
          },
          ...(authorId
            ? [
                {
                  icon: "eye-off" as const,
                  label: t("작성자 차단하기"),
                  danger: true,
                  onPress: () => requestBlock({ userId: authorId, name: authorName }),
                },
              ]
            : []),
        ]
      : [],
    // openReport·requestBlock은 위 주석대로 의존성에서 뺀다
    [postId, authorId, authorName, isMine, canReport, t],
  );

  const sheets = (
    <>
      {reportSheet}
      {blockDialog}
    </>
  );
  return { items, sheets };
}
