import { useQuery } from "@tanstack/react-query";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

import { API_BASE_URL } from "../../shared/api/config";
import { AppSheet, type AppSheetRef } from "../../shared/components/base/AppSheet";
import { Button } from "../../shared/components/base/Button";
import { Icon } from "../../shared/components/base/Icon";
import { DateField } from "../../shared/components/composed/DateField";
import { useAuthStore } from "../../shared/store/useAuthStore";
import { colors } from "../../shared/theme/tokens";
import { useCells } from "../cell/api";
import { fetchTeams } from "../profile/api";
import { RadioOption } from "./components/RadioOption";

type DataKind = "member" | "attendance" | "both";
type Target = "all" | "cell" | "team";
type Period = "all" | "thisYear" | "lastYear" | "custom";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function SectionLabel({ children }: { children: string }) {
  return <Text className="text-body-main text-text-normal">{children}</Text>;
}

// 관리자 출석부·회원 관리 헤더의 "다운로드"로 진입. GET /admin/download가 만든 엑셀
// (attendance-data-model.md §4 — 유저 정보 + 셀 기간별 출석부 시트)을 받아 공유 시트를 띄운다.
export function AdminDataDownloadScreen() {
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
      const stamp = new Date().toISOString().slice(0, 10);
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
      await Sharing.shareAsync(file.uri, { mimeType: XLSX_MIME, dialogTitle: "데이터 다운로드" });
    } catch {
      Alert.alert("다운로드 실패", "잠시 후 다시 시도해주세요.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View className="flex-1 bg-background-normal">
      <ScrollView contentContainerClassName="gap-7 px-5 pb-6 pt-6">
        <View className="gap-4">
          <SectionLabel>어떤 데이터가 필요하세요?</SectionLabel>
          <View className="flex-row items-center gap-5">
            <RadioOption
              label="회원 정보"
              selected={dataKind === "member"}
              onPress={() => setDataKind("member")}
            />
            <RadioOption
              label="출석 데이터"
              selected={dataKind === "attendance"}
              onPress={() => setDataKind("attendance")}
            />
            <RadioOption
              label="둘 다"
              selected={dataKind === "both"}
              onPress={() => setDataKind("both")}
            />
          </View>
        </View>

        <View className="gap-4">
          <SectionLabel>누구의 데이터인가요?</SectionLabel>
          <View className="flex-row items-center gap-5">
            <RadioOption
              label="청년부 전체"
              selected={target === "all"}
              onPress={() => setTarget("all")}
            />
            <RadioOption
              label="특정 셀"
              selected={target === "cell"}
              onPress={() => setTarget("cell")}
            />
            <RadioOption
              label="특정 팀"
              selected={target === "team"}
              onPress={() => setTarget("team")}
            />
          </View>
          {(target === "cell" || target === "team") && (
            <Pressable
              className="h-12 flex-row items-center justify-between rounded-2.5 bg-background-muted px-4"
              onPress={() => pickerSheetRef.current?.open()}
              style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
            >
              <Text className="text-body-regular text-text-alternative">
                {target === "team" ? "선택한 팀" : "선택한 셀"}
              </Text>
              <View className="flex-row items-center gap-2">
                <Text className="text-body-main text-primary-normal">
                  {pickerValue ?? "선택해주세요"}
                </Text>
                <Icon name="expand-right" size={14} color={colors.icon.normal} />
              </View>
            </Pressable>
          )}
        </View>

        <View className="gap-4">
          <SectionLabel>어느 기간이요?</SectionLabel>
          <View className="flex-row flex-wrap items-center gap-x-5 gap-y-3">
            <RadioOption
              label="전체"
              selected={period === "all"}
              onPress={() => setPeriod("all")}
            />
            <RadioOption
              label="올해"
              selected={period === "thisYear"}
              onPress={() => setPeriod("thisYear")}
            />
            <RadioOption
              label="작년"
              selected={period === "lastYear"}
              onPress={() => setPeriod("lastYear")}
            />
            <RadioOption
              label="직접 선택"
              selected={period === "custom"}
              onPress={() => setPeriod("custom")}
            />
          </View>
          {period === "custom" && (
            <View className="-mt-4">
              <DateField
                label=""
                placeholder="시작일을 선택하세요."
                value={customFrom}
                onChange={setCustomFrom}
              />
              <View className="-mt-4">
                <DateField
                  label=""
                  placeholder="종료일을 선택하세요."
                  value={customTo}
                  onChange={setCustomTo}
                />
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View className="px-5 pb-12">
        <Button
          label={downloading ? "만드는 중..." : "다운로드"}
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
            <Text className="text-body-regular text-text-alternative">취소</Text>
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
