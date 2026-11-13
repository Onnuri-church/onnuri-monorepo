import {
  REPORT_REASON_LABELS,
  type ReportReason,
  type ReportTargetType,
} from "@onnuri/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "../../shared/components/base/Button";
import { useAuthStore } from "../../shared/store/useAuthStore";
import { useThemeColors } from "../../shared/theme/useThemeColors";
import { useCreateReport } from "./api";

interface ReportTarget {
  targetType: ReportTargetType;
  targetId: string;
}

const REASONS = Object.keys(REPORT_REASON_LABELS) as ReportReason[];

// 신고하기 (SCRUM-199). 사유를 고르고 보내면 관리자에게 알림이 간다.
// 화면은 openReport를 버튼에 걸고 sheet를 화면 안에 한 번 그린다 (차단의 useBlockConfirm과 같은 모양).
export function useReport() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();
  const canReport = useAuthStore((state) => state.session.status === "authenticated");
  const [target, setTarget] = useState<ReportTarget | null>(null);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState("");
  const { mutate: report, isPending } = useCreateReport();

  const close = () => {
    setTarget(null);
    setReason(null);
    setDetail("");
  };

  const openReport = (next: ReportTarget) => setTarget(next);

  const submit = () => {
    if (!target || !reason) return;
    report(
      { ...target, reason, detail: detail.trim() || undefined },
      {
        onSuccess: () => {
          close();
          Alert.alert(t("신고가 접수됐어요"), t("관리자가 확인한 뒤 조치할게요. 고마워요."));
        },
        onError: () => Alert.alert(t("신고하지 못했어요"), t("잠시 후 다시 시도해 주세요.")),
      },
    );
  };

  const sheet = (
    <Modal visible={target !== null} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable className="flex-1 justify-end bg-background-dark/50" onPress={close}>
          {/* 안쪽 탭이 바깥 닫기로 새지 않게 Pressable로 감싼다 */}
          <Pressable
            className="gap-4 rounded-t-3xl bg-background-normal px-5 pt-6"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <Text className="text-heading-small text-text-normal">{t("신고하기")}</Text>
            <Text className="text-body-small text-text-alternative">
              {t("신고한 사실은 상대에게 알리지 않아요.")}
            </Text>
            <View>
              {REASONS.map((value) => (
                <Pressable
                  key={value}
                  className="h-12 flex-row items-center justify-between border-b border-background-assistive active:opacity-60"
                  onPress={() => setReason(value)}
                >
                  <Text className="text-body-main text-text-normal">{t(REPORT_REASON_LABELS[value])}</Text>
                  <View
                    className={
                      reason === value
                        ? "h-5 w-5 rounded-full border-4 border-primary-normal"
                        : "h-5 w-5 rounded-full border border-text-assistive"
                    }
                  />
                </Pressable>
              ))}
            </View>
            {reason === "OTHER" && (
              <TextInput
                className="min-h-20 rounded-xl border border-background-assistive px-3 py-2 text-body-medium text-text-normal"
                placeholder={t("어떤 문제인지 적어 주세요 (선택)")}
                placeholderTextColor={themeColors.text.assistive}
                value={detail}
                onChangeText={setDetail}
                maxLength={500}
                multiline
              />
            )}
            <Button label={t("신고하기")} onPress={submit} disabled={!reason} loading={isPending} />
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );

  return { openReport, sheet, canReport };
}
