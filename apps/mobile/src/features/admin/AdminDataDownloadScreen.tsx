import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { type ReactNode, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

import { API_BASE_URL } from "../../shared/api/config";
import { AppSheet, type AppSheetRef } from "../../shared/components/base/AppSheet";
import { Button } from "../../shared/components/base/Button";
import { Icon } from "../../shared/components/base/Icon";
import { toDateString } from "../../shared/components/composed/DateField";
import { useAuthStore } from "../../shared/store/useAuthStore";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useCells } from "../cell/api";
import { fetchTeams } from "../profile/api";
import { useAdminDownloadPreview } from "./api";
import { DateRangeField } from "./components/DateRangeField";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type DataKind = "member" | "attendance" | "both";
type Target = "all" | "cell" | "team";
type Period = "all" | "thisYear" | "lastYear" | "custom";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// 질문 하나 = 번호 + 질문 + 답 (SCRUM-245). 답하면 번호가 체크로 바뀌어 어디까지 했는지 보인다.
function Step({
  index,
  done,
  title,
  children,
}: {
  index: number;
  done: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <View className="flex-row gap-3">
      <View
        className={
          done
            ? "h-6 w-6 items-center justify-center rounded-full bg-primary-normal"
            : "h-6 w-6 items-center justify-center rounded-full bg-background-alternative"
        }
      >
        <Text
          className={
            done ? "text-caption-small text-text-disable" : "text-caption-small text-primary-normal"
          }
        >
          {done ? "✓" : String(index)}
        </Text>
      </View>
      <View className="flex-1 gap-3">
        <Text className="pt-0.5 text-body-main text-text-normal">{title}</Text>
        {children}
      </View>
    </View>
  );
}

// 알약 모양 선택지 — 작은 라디오 원 대신 누르기 쉬운 칸, 고르면 초록 테두리·옅은 초록 바탕.
function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      className={
        selected
          ? "rounded-full border border-primary-normal bg-background-alternative px-4 py-2"
          : "rounded-full border border-background-assistive bg-background-normal px-4 py-2"
      }
      onPress={onPress}
      style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
    >
      <Text
        className={
          selected ? "text-body-small text-primary-normal" : "text-body-small text-text-neutral"
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T | null;
  onChange: (id: T) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((option) => (
        <Chip
          key={option.id}
          label={option.label}
          selected={value === option.id}
          onPress={() => onChange(option.id)}
        />
      ))}
    </View>
  );
}

// 관리자 출석부·회원 관리 헤더의 "다운로드"로 진입. GET /admin/download가 만든 엑셀
// (attendance-data-model.md §4 — 유저 정보 + 셀 기간별 출석부 시트)을 받아 공유 시트를 띄운다.
export function AdminDataDownloadScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [dataKind, setDataKind] = useState<DataKind | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [period, setPeriod] = useState<Period | null>(null);
  const [customFrom, setCustomFrom] = useState<string | null>(null);
  const [customTo, setCustomTo] = useState<string | null>(null);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const pickerSheetRef = useRef<AppSheetRef>(null);

  // 셀/팀 선택지는 실데이터.
  const { data: cells } = useCells();
  const { data: teams } = useQuery({ queryKey: ["teams"], queryFn: fetchTeams });
  const pickerOptions = target === "team" ? (teams ?? []) : (cells ?? []);
  const pickerId = target === "team" ? selectedTeamId : selectedCellId;
  const pickerValue = pickerOptions.find((option) => option.id === pickerId)?.name ?? null;

  // 세 질문에 다 답해야 활성 — 특정 셀/팀이면 대상, 직접 선택이면 날짜까지 (시안의 비활성 회색 버튼).
  const canDownload =
    dataKind !== null &&
    target !== null &&
    period !== null &&
    (target === "all" || pickerId !== null) &&
    (period !== "custom" || (customFrom !== null && customTo !== null)) &&
    !downloading;

  // 다운로드와 같은 쿼리 — 세 질문이 다 채워지면 건수 요약을 미리 받아 보여준다.
  const query: Record<string, string> | null =
    dataKind !== null &&
    target !== null &&
    period !== null &&
    (target === "all" || pickerId !== null) &&
    (period !== "custom" || (customFrom !== null && customTo !== null))
      ? {
          kind: dataKind,
          scope: target,
          period,
          ...(target !== "all" && pickerId ? { groupId: pickerId } : {}),
          ...(period === "custom" && customFrom && customTo
            ? { from: customFrom, to: customTo }
            : {}),
        }
      : null;
  const { data: preview, isLoading: previewLoading } = useAdminDownloadPreview(query);

  const handlePickerSelect = (optionId: string) => {
    if (target === "team") {
      setSelectedTeamId(optionId);
    } else {
      setSelectedCellId(optionId);
    }
    pickerSheetRef.current?.close();
  };

  const handleDownloadPress = async () => {
    if (!dataKind || !target || !period || downloading) return;
    // 관리자 메뉴 안이라 항상 로그인 상태다 — downloadFileAsync는 apiClient를 안 거쳐서 토큰을 직접 붙인다.
    const { session } = useAuthStore.getState();
    if (session.status !== "authenticated") return;

    const params = new URLSearchParams({ kind: dataKind, scope: target, period });
    if (target !== "all" && pickerId) params.set("groupId", pickerId);
    if (period === "custom" && customFrom && customTo) {
      params.set("from", customFrom);
      params.set("to", customTo);
    }

    setDownloading(true);
    try {
      // 파일명의 날짜는 기기 시간대의 오늘이다 — toISOString은 UTC라 자정~오전 9시(KST)에 전날로 찍힌다.
      const stamp = toDateString(new Date());
      const destination = new File(Paths.cache, `onnuri-export-${stamp}.xlsx`);
      const file = await File.downloadFileAsync(
        `${API_BASE_URL}/admin/download?${params.toString()}`,
        destination,
        {
          headers: { Authorization: `Bearer ${session.accessToken}` },
          idempotent: true,
        },
      );
      // 앱 안에는 엑셀 뷰어가 없으니 OS 공유 시트로 넘긴다 — 파일 앱 저장·카톡 전송 등.
      await Sharing.shareAsync(file.uri, {
        mimeType: XLSX_MIME,
        dialogTitle: t("데이터 다운로드"),
      });
    } catch {
      Alert.alert(t("다운로드 실패"), t("잠시 후 다시 시도해주세요."));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View className="flex-1 bg-background-normal">
      <ScrollView
        contentContainerClassName="gap-8 px-5 pt-6"
        // 바닥 여백에 안전영역을 더한다 — 안드로이드 내비 바에 마지막 항목이 가리지 않게.
        contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
      >
        <Step index={1} done={dataKind !== null} title={t("어떤 데이터가 필요하세요?")}>
          <ChipRow
            value={dataKind}
            onChange={setDataKind}
            options={[
              { id: "member", label: t("회원 정보") },
              { id: "attendance", label: t("출석 데이터") },
              { id: "both", label: t("둘 다") },
            ]}
          />
        </Step>

        <Step
          index={2}
          done={target === "all" || (target !== null && pickerId !== null)}
          title={t("누구의 데이터인가요?")}
        >
          <ChipRow
            value={target}
            onChange={setTarget}
            options={[
              { id: "all", label: t("청년부 전체") },
              { id: "cell", label: t("특정 셀") },
              { id: "team", label: t("특정 팀") },
            ]}
          />
          {(target === "cell" || target === "team") && (
            <Pressable
              className="h-12 flex-row items-center justify-between rounded-2.5 bg-background-muted px-4"
              onPress={() => pickerSheetRef.current?.open()}
              style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
            >
              <Text className="text-body-regular text-text-alternative">
                {target === "team" ? t("선택한 팀") : t("선택한 셀")}
              </Text>
              <View className="flex-row items-center gap-2">
                <Text className="text-body-main text-primary-normal">
                  {pickerValue ?? t("선택해주세요")}
                </Text>
                <Icon name="expand-right" size={14} color={colors.icon.normal} />
              </View>
            </Pressable>
          )}
        </Step>

        <Step
          index={3}
          done={
            period !== null && (period !== "custom" || (customFrom !== null && customTo !== null))
          }
          title={t("어느 기간이요?")}
        >
          <ChipRow
            value={period}
            onChange={setPeriod}
            options={[
              { id: "all", label: t("전체") },
              { id: "thisYear", label: t("올해") },
              { id: "lastYear", label: t("작년") },
              { id: "custom", label: t("직접 선택") },
            ]}
          />
          {period === "custom" && (
            <DateRangeField
              from={customFrom}
              to={customTo}
              onChange={(from, to) => {
                setCustomFrom(from);
                setCustomTo(to);
              }}
            />
          )}
        </Step>
      </ScrollView>

      <View
        className="border-t border-background-muted bg-background-normal px-5 pt-3"
        style={{ paddingBottom: 12 + insets.bottom }}
      >
        {query && (
          <Pressable
            className="mb-3 flex-row items-center justify-between rounded-2.5 bg-background-alternative px-4 py-3"
            onPress={() => navigation.navigate("AdminDataPreview", { query })}
            style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
          >
            <Text className="flex-1 text-caption-main text-primary-normal">
              {previewLoading || !preview
                ? t("내려받을 내용을 확인하고 있어요.")
                : [
                    preview.member ? t("회원 {{count}}명", { count: preview.member.total }) : null,
                    preview.attendance
                      ? t("출석부 {{lines}}줄 · {{weeks}}주", {
                          lines: preview.attendance.total,
                          weeks: preview.attendance.weekCount,
                        })
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
            </Text>
            <View className="flex-row items-center gap-1">
              <Text className="text-body-main text-primary-normal">{t("미리보기")}</Text>
              <Icon name="expand-right" size={14} color={colors.icon.normal} />
            </View>
          </Pressable>
        )}
        <Button
          label={downloading ? t("만드는 중...") : t("엑셀로 내려받기")}
          disabled={!canDownload}
          onPress={handleDownloadPress}
        />
      </View>

      {/* 셀/팀 선택 시트 (시안 액션시트) */}
      <AppSheet
        ref={pickerSheetRef}
        footer={
          <Pressable
            className="items-center bg-background-normal py-4"
            onPress={() => pickerSheetRef.current?.close()}
          >
            <Text className="text-body-regular text-text-alternative">{t("취소")}</Text>
          </Pressable>
        }
      >
        <View className="px-6 pb-2 pt-1">
          {pickerOptions.map((option) => (
            <Pressable
              key={option.id}
              className="py-3"
              onPress={() => handlePickerSelect(option.id)}
              style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
            >
              <Text
                className={
                  option.id === pickerId
                    ? "text-body-main text-primary-normal"
                    : "text-body-regular text-text-normal"
                }
              >
                {option.name}
              </Text>
            </Pressable>
          ))}
        </View>
      </AppSheet>
    </View>
  );
}
