import { REPORT_REASON_LABELS, type AdminReportItem } from "@onnuri/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FilterChip } from "../../shared/components/base/FilterChip";
import { PressableScale } from "../../shared/components/base/PressableScale";
import { useThemeColors } from "../../shared/theme/useThemeColors";
import { toTimeAgo } from "../../shared/utils/date";
import { useAdminReports, useHandleReport } from "../report/api";

const TARGET_LABELS: Record<AdminReportItem["targetType"], string> = {
  POST: "게시글",
  COMMENT: "댓글",
  CHAT_MESSAGE: "채팅",
  TEAM_BOARD_POST: "팀 게시판 글",
  TEAM_BOARD_COMMENT: "팀 게시판 댓글",
};

const STATUS_LABELS: Record<AdminReportItem["status"], string> = {
  OPEN: "처리 전",
  HIDDEN: "숨김 처리",
  DISMISSED: "문제없음",
};

// 관리자 신고 관리 (SCRUM-199). 신고가 들어오면 관리자에게 알림이 오고, 여기서 글을 숨기거나
// 문제없다고 넘긴다. 같은 글의 신고는 한 번 처리하면 모두 닫힌다.
export function AdminReportsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();
  const [status, setStatus] = useState<"open" | "done">("open");
  const { data: reports, isPending, refetch, isRefetching } = useAdminReports(status);
  const { mutate: handle, isPending: handling } = useHandleReport();

  const confirmHide = (report: AdminReportItem) =>
    Alert.alert(t("이 글을 숨길까요?"), t("작성자와 모든 사람에게서 글이 내려가요."), [
      { text: t("취소"), style: "cancel" },
      {
        text: t("숨기기"),
        style: "destructive",
        onPress: () => handle({ id: report.id, action: "hide" }),
      },
    ]);

  return (
    <ScrollView
      className="bg-background-normal"
      contentContainerClassName="gap-4 px-5 pt-5"
      contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
    >
      <View className="flex-row gap-2">
        <FilterChip label={t("처리 전")} selected={status === "open"} onPress={() => setStatus("open")} />
        <FilterChip label={t("처리됨")} selected={status === "done"} onPress={() => setStatus("done")} />
      </View>

      {isPending ? (
        <ActivityIndicator color={themeColors.primary.normal} />
      ) : !reports || reports.length === 0 ? (
        <Text className="pt-10 text-center text-body-medium text-text-alternative">
          {status === "open" ? t("처리할 신고가 없어요.") : t("처리한 신고가 없어요.")}
        </Text>
      ) : (
        reports.map((report) => (
          <View key={report.id} className="gap-2 rounded-5 bg-background-normal px-4 py-4 shadow-card">
            <View className="flex-row items-center justify-between">
              <Text className="text-body-main text-text-normal">
                {t(REPORT_REASON_LABELS[report.reason])} · {t(TARGET_LABELS[report.targetType])}
              </Text>
              <Text className="text-body-small text-text-alternative">{toTimeAgo(report.createdAt)}</Text>
            </View>
            <Text className="text-body-medium text-text-neutral" numberOfLines={6}>
              {report.snapshot}
            </Text>
            {report.detail && (
              <Text className="text-body-small text-text-alternative">
                {t("신고 내용: {{detail}}", { detail: report.detail })}
              </Text>
            )}
            <Text className="text-body-small text-text-alternative">
              {t("작성자 {{author}} · 신고자 {{reporter}}", {
                author: report.targetAuthorName,
                reporter: report.reporterName,
              })}
              {report.openCountForTarget > 1 &&
                ` · ${t("같은 글 신고 {{count}}건", { count: report.openCountForTarget })}`}
            </Text>
            {report.status === "OPEN" ? (
              <View className="mt-1 flex-row gap-2">
                <PressableScale
                  scaleTo={0.97}
                  disabled={handling}
                  className="flex-1 items-center rounded-xl bg-semantic-danger py-2.5"
                  onPress={() => confirmHide(report)}
                >
                  <Text className="text-body-main text-background-normal">{t("숨기기")}</Text>
                </PressableScale>
                <PressableScale
                  scaleTo={0.97}
                  disabled={handling}
                  className="flex-1 items-center rounded-xl border border-background-assistive py-2.5"
                  onPress={() => handle({ id: report.id, action: "dismiss" })}
                >
                  <Text className="text-body-main text-text-neutral">{t("문제없음")}</Text>
                </PressableScale>
              </View>
            ) : (
              <Text className="text-body-small text-primary-normal">{t(STATUS_LABELS[report.status])}</Text>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}
